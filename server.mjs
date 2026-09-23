import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.NOBA_RATE_LIMIT || 30);
const rateBuckets = new Map();
const SECURITY_STATE_FILE = process.env.NOBA_SECURITY_STATE_FILE || path.join(process.cwd(), 'security-state.json');
const DEFAULT_MASTER_PIN = String(process.env.NOBA_MASTER_PIN || '2580');

function readSecurityState() {
  try {
    const raw = fs.readFileSync(SECURITY_STATE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (/^\d{4,8}$/.test(String(data.pin || ''))) return { pin: String(data.pin) };
  } catch (_) {}
  return { pin: DEFAULT_MASTER_PIN };
}

function writeSecurityState(pin) {
  const tmp = `${SECURITY_STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ pin, updatedAt: new Date().toISOString() }, null, 2));
  fs.renameSync(tmp, SECURITY_STATE_FILE);
}

function securityPinVerify(body) {
  const pin = String(body.pin || '');
  return { valid: pin === readSecurityState().pin };
}

function securityPinChange(body) {
  const currentPin = String(body.currentPin || '');
  const newPin = String(body.newPin || '');
  const state = readSecurityState();
  if (currentPin !== state.pin) { const error = new Error('CURRENT_PIN_INVALID'); error.statusCode = 401; throw error; }
  if (!/^\d{4,8}$/.test(newPin)) { const error = new Error('NEW_PIN_INVALID'); error.statusCode = 400; throw error; }
  writeSecurityState(newPin);
  return { ok: true, changed: true };
}

function rateLimitKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const key = rateLimitKey(req);
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || now - existing.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  existing.count += 1;
  return existing.count > RATE_LIMIT_MAX;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 256 * 1024) req.destroy(new Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

async function chat(body) {
  const text = String(body.text || '').trim();
  if (!text) throw new Error('EMPTY_TEXT');
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const personalityMap = {
    friendly: 'صمیمی، گرم و محترمانه',
    smart: 'باهوش، دقیق و تحلیل‌گر',
    calm: 'آرام، دلگرم‌کننده و متین',
    playful: 'شوخ‌طبع و بانمک، بدون بی‌احترامی',
    serious: 'رسمی، دقیق و کوتاه'
  };
  const personality = personalityMap[String(body.personality || 'friendly')] || personalityMap.friendly;
  const messages = [
    { role: 'system', content: `تو زهره، دستیار فارسی اپ نوبا هستی. شخصیت فعلی تو ${personality} است. پاسخ‌ها را طبیعی، کوتاه و مفید به فارسی بده. اگر فرمانی برای دستگاه یا امکاناتی خارج از دسترس داده شد، ادعا نکن که اجرا شده؛ صادقانه بگو چه چیزی واقعاً در دسترس است.` },
    ...history.map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content || '') })).filter((item) => item.content),
    { role: 'user', content: text },
  ];

  // Free-tier-first path: Groq's current free tier can be used with gpt-oss-20b within its published limits.
  // Paid OpenAI remains an optional fallback; the API key is never shipped inside the mobile app.
  if (GROQ_API_KEY) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_completion_tokens: 500, include_reasoning: false }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Groq HTTP ${response.status}`);
    const outputText = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!outputText) throw new Error('EMPTY_AI_RESPONSE');
    return { text: outputText, model: GROQ_MODEL, provider: 'groq' };
  }

  if (!OPENAI_API_KEY) throw new Error('NO_AI_PROVIDER_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, input: messages, max_output_tokens: 500, store: false }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  const outputText = String(data.output_text || '').trim();
  if (!outputText) throw new Error('EMPTY_AI_RESPONSE');
  return { text: outputText, model: OPENAI_MODEL, provider: 'openai' };
}
/*
 * Music search:
 * Uses Apple's public iTunes Search API to find tracks and returns a
 * provider-supplied preview URL. This is a legal preview, not a way to
 * download or bypass a paid/full-song service.
 */
async function musicSearch(body) {
  const query = String(body.query || '').trim();
  if (!query) throw new Error('EMPTY_QUERY');

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', query);
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', '10');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`MUSIC_SEARCH_HTTP_${response.status}`);

  const data = await response.json();
  const tracks = Array.isArray(data.results) ? data.results : [];
  const playable = tracks.find((x) => x.previewUrl);

  if (!playable) {
    return {
      result: null,
      results: [],
      message: 'برای این جست‌وجو پیش‌نمایش قابل پخش پیدا نشد.',
    };
  }

  return {
    result: {
      uri: playable.previewUrl,
      title: `${playable.trackName || query} — ${playable.artistName || ''}`.trim(),
      artist: playable.artistName || '',
      album: playable.collectionName || '',
      artwork: playable.artworkUrl100 || null,
      provider: 'Apple iTunes Search',
      previewOnly: true,
    },
    results: tracks.filter((x) => x.previewUrl).map((x) => ({
      uri: x.previewUrl,
      title: `${x.trackName || query} — ${x.artistName || ''}`.trim(),
      artist: x.artistName || '',
      album: x.collectionName || '',
      artwork: x.artworkUrl100 || null,
      provider: 'Apple iTunes Search',
      previewOnly: true,
    })),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'OPTIONS' && req.url !== '/api/health' && isRateLimited(req)) {
    return sendJson(res, 429, { error: 'RATE_LIMITED', message: 'لطفاً چند لحظه بعد دوباره تلاش کنید.' });
  }
  if (req.method === 'POST' && req.url === '/api/security/pin/verify') {
    try { const body = await readJson(req); return sendJson(res, 200, securityPinVerify(body)); }
    catch (error) { return sendJson(res, error.statusCode || 500, { error: error?.message || 'PIN_VERIFY_FAILED' }); }
  }
  if (req.method === 'POST' && req.url === '/api/security/pin/change') {
    try { const body = await readJson(req); return sendJson(res, 200, securityPinChange(body)); }
    catch (error) { return sendJson(res, error.statusCode || 500, { error: error?.message || 'PIN_CHANGE_FAILED' }); }
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      aiConfigured: Boolean(GROQ_API_KEY || OPENAI_API_KEY),
      provider: GROQ_API_KEY ? 'groq' : (OPENAI_API_KEY ? 'openai' : null),
      model: GROQ_API_KEY ? GROQ_MODEL : OPENAI_MODEL,
      musicSearch: true,
    });
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body = await readJson(req);
      return sendJson(res, 200, await chat(body));
    } catch (error) {
      return sendJson(res, 500, { error: error?.message || 'AI_REQUEST_FAILED' });
    }
  }
  if (req.method === 'POST' && req.url === '/api/music-search') {
    try {
      const body = await readJson(req);
      return sendJson(res, 200, await musicSearch(body));
    } catch (error) {
      return sendJson(res, 500, { error: error?.message || 'MUSIC_SEARCH_FAILED' });
    }
  }
  return sendJson(res, 404, { error: 'NOT_FOUND' });
});

server.listen(PORT, () => console.log(`NOBA AI backend listening on :${PORT}`));
