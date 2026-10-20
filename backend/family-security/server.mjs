import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import pg from 'pg';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const app = express();
const PORT = Number(process.env.PORT || 8080);
const SESSION_SECRET = String(process.env.SESSION_SECRET || '');
const DB_URL = String(process.env.DATABASE_URL || '');
const FAMILY_NAME = String(process.env.FAMILY_NAME || 'خانواده کوروش نوا').trim();
const PRIMARY_ROLE = String(process.env.FAMILY_PRIMARY_OWNER || 'father').toLowerCase();
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || '*');
const configuredParents = [
  { role: 'father', email: String(process.env.FAMILY_PARENT_FATHER_EMAIL || '').trim().toLowerCase(), name: String(process.env.FAMILY_PARENT_FATHER_NAME || 'پدر').trim() },
  { role: 'mother', email: String(process.env.FAMILY_PARENT_MOTHER_EMAIL || '').trim().toLowerCase(), name: String(process.env.FAMILY_PARENT_MOTHER_NAME || 'مادر').trim() },
].filter((v) => v.email);
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: /sslmode=require/i.test(DB_URL) ? { rejectUnauthorized: true } : undefined, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 }) : null;
const mailer = smtpConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
}) : null;

const POLICY_KEYS = [
  'appStart', 'speakerPower', 'childLock', 'nora', 'contacts', 'camera', 'commandRoom',
  'lighting', 'musicLibrary', 'fuses', 'diagnostics', 'imageSettings', 'liveMic',
];
const KNOWN_METHODS = new Set(['pin', 'pattern', 'biometric']);
const optionsKeys = POLICY_KEYS.filter((key) => key !== 'camera');
const appReady = Boolean(
  pool && SESSION_SECRET.length >= 32 &&
  ['father', 'mother'].includes(PRIMARY_ROLE) &&
  configuredParents.length >= 1 && configuredParents.length <= 2 &&
  new Set(configuredParents.map((v) => v.email)).size === configuredParents.length &&
  configuredParents.some((v) => v.role === PRIMARY_ROLE) && smtpConfigured,
);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb', strict: true }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.path.startsWith('/v1/') && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(400).json({ code: 'https_required', message: 'HTTPS is required.' });
  }
  next();
});

const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'rate_limited', message: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کن.' } });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true, message: { code: 'rate_limited', message: 'تلاش‌های ورود زیاد شده است؛ کمی بعد دوباره تلاش کن.' } });

function replyError(res, status, code, message) { return res.status(status).json({ code, message }); }
function cleanEmail(value) { return String(value || '').trim().toLowerCase().slice(0, 254); }
function getParent(email) { return configuredParents.find((p) => p.email === cleanEmail(email)) || null; }
function maskEmail(email) {
  const [name = '', domain = ''] = String(email || '').split('@');
  const visible = name.length < 3 ? `${name.slice(0, 1)}*` : `${name.slice(0, 2)}${'*'.repeat(Math.min(6, Math.max(2, name.length - 2)))}`;
  return `${visible}@${domain || '***'}`;
}
function hmac(value) { return createHmac('sha256', SESSION_SECRET).update(String(value)).digest('hex'); }
function safeHexEqual(left, right) {
  try { const a = Buffer.from(String(left || ''), 'hex'); const b = Buffer.from(String(right || ''), 'hex'); return a.length === b.length && a.length > 0 && timingSafeEqual(a, b); }
  catch { return false; }
}
function normalizeRecovery(value) { return String(value || '').toUpperCase().replace(/[^A-F0-9]/g, ''); }
function makeRecoveryCode() { return randomBytes(10).toString('hex').toUpperCase().match(/.{1,4}/g).join('-'); }
function base64url(value) { return Buffer.from(value).toString('base64url'); }
function issueToken(parent) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: parent.email, role: parent.role, name: parent.name, iat: now, exp: now + 12 * 60 * 60 }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac('sha256', SESSION_SECRET).update(unsigned).digest('base64url')}`;
}
function readToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', SESSION_SECRET).update(unsigned).digest();
  let supplied;
  try { supplied = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload?.sub || !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    const approved = getParent(payload.sub);
    if (!approved || approved.role !== payload.role) return null;
    return approved;
  } catch { return null; }
}
function requireParent(req, res, next) {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده هنوز به‌طور کامل پیکربندی نشده است.');
  const parent = readToken(req);
  if (!parent) return replyError(res, 401, 'parent_auth_required', 'برای مدیریت امنیت، والد تأییدشده باید دوباره با کد ایمیل وارد شود.');
  req.parent = parent;
  next();
}
async function requireDevice(req, res, next) {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده هنوز پیکربندی نشده است.');
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return replyError(res, 401, 'device_enrollment_required', 'این گوشی عضو تأییدشدهٔ خانواده نیست.');
  try {
    const tokenHash = hmac(`device:${match[1]}`);
    const result = await pool.query('SELECT device_id, device_name, device_role, created_by_email, revoked_at FROM family_devices WHERE token_hash=$1', [tokenHash]);
    const device = result.rows[0];
    if (!device || device.revoked_at) return replyError(res, 401, 'device_revoked', 'عضویت این گوشی لغو شده است؛ برای اتصال دوباره، والد باید کد تازه بسازد.');
    req.familyDevice = device;
    await pool.query('UPDATE family_devices SET last_seen_at=now() WHERE device_id=$1', [device.device_id]);
    next();
  } catch {
    return replyError(res, 503, 'device_check_failed', 'تأیید عضویت گوشی انجام نشد.');
  }
}
function validDeviceId(value) { return /^[a-f0-9]{48}$/.test(String(value || '')); }
function createDeviceToken() { return randomBytes(32).toString('base64url'); }
async function registerDevice({ deviceId, deviceName, role, parentEmail }) {
  const deviceToken = createDeviceToken();
  const tokenHash = hmac(`device:${deviceToken}`);
  const name = String(deviceName || 'گوشی خانواده کوروش نوا').trim().slice(0, 80) || 'گوشی خانواده کوروش نوا';
  if (role === 'member') {
    // A family pairing code must never overwrite or downgrade an existing admin device ID.
    const inserted = await pool.query(
      `INSERT INTO family_devices(device_id, token_hash, device_name, device_role, created_by_email, last_seen_at, revoked_at)
       VALUES($1,$2,$3,'member',$4,now(),NULL)
       ON CONFLICT(device_id) DO NOTHING RETURNING device_id`,
      [deviceId, tokenHash, name, parentEmail],
    );
    if (!inserted.rows[0]) return null;
  } else {
    await pool.query(
      `INSERT INTO family_devices(device_id, token_hash, device_name, device_role, created_by_email, last_seen_at, revoked_at)
       VALUES($1,$2,$3,'admin',$4,now(),NULL)
       ON CONFLICT(device_id) DO UPDATE SET token_hash=EXCLUDED.token_hash, device_name=EXCLUDED.device_name,
         device_role=EXCLUDED.device_role, created_by_email=EXCLUDED.created_by_email, last_seen_at=now(), revoked_at=NULL`,
      [deviceId, tokenHash, name, parentEmail],
    );
  }
  return { deviceToken, deviceId };
}
async function derive(value, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytes(16);
  const result = await scrypt(String(value), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt: salt.toString('hex'), hash: Buffer.from(result).toString('hex') };
}
async function compareSecret(value, saltHex, hashHex) {
  if (!saltHex || !hashHex) return false;
  const result = await derive(value, saltHex);
  return safeHexEqual(result.hash, hashHex);
}
async function consumeOtp(email, code) {
  // Serialize attempts for one email so an OTP cannot be consumed twice by concurrent requests.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT code_hash, expires_at, attempts FROM family_auth_codes WHERE email = $1 FOR UPDATE',
      [email],
    );
    const row = result.rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now() || Number(row.attempts) >= 5) {
      await client.query('ROLLBACK');
      return false;
    }
    const candidate = hmac(`otp:${email}:${String(code || '').trim()}`);
    if (!safeHexEqual(candidate, row.code_hash)) {
      await client.query('UPDATE family_auth_codes SET attempts = attempts + 1 WHERE email = $1', [email]);
      await client.query('COMMIT');
      return false;
    }
    await client.query('DELETE FROM family_auth_codes WHERE email = $1', [email]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
async function getSettings() {
  const result = await pool.query('SELECT * FROM family_security_settings WHERE singleton = true');
  if (!result.rows[0]) throw new Error('family_security_settings row is missing; apply migrations/001_family_security.sql first.');
  return result.rows[0];
}
function shapeSnapshot(row, currentParent = null) {
  const owners = configuredParents.map((p) => ({
    role: p.role,
    name: p.name,
    emailMasked: maskEmail(p.email),
    isPrimary: p.role === PRIMARY_ROLE,
  }));
  const rawOptions = row.security_options && typeof row.security_options === 'object' ? row.security_options : {};
  const options = Object.fromEntries(POLICY_KEYS.map((key) => [key, key === 'camera' ? false : rawOptions[key] === true]));
  return {
    configured: true,
    familyName: FAMILY_NAME,
    primaryOwnerRole: PRIMARY_ROLE,
    currentRole: currentParent?.role || null,
    currentName: currentParent?.name || null,
    parentAdmins: owners,
    authMethod: KNOWN_METHODS.has(row.auth_method) ? row.auth_method : 'pin',
    biometricAllowed: row.biometric_allowed === true,
    hasCredential: row.has_credential === true,
    options,
    policyVersion: Number(row.policy_version || 1),
    updatedAt: row.updated_at || null,
  };
}
function validatedOptions(input) {
  const result = {};
  for (const key of POLICY_KEYS) result[key] = key !== 'camera' && input?.[key] === true;
  return result;
}

app.get('/v1/health', async (_req, res) => {
  if (!appReady) return res.json({ ok: true, configured: false, version: '1.0.0' });
  try {
    await pool.query('SELECT 1');
    await pool.query('SELECT 1 FROM family_devices LIMIT 1');
    await pool.query('SELECT 1 FROM family_pair_codes LIMIT 1');
    // Do not report the family service ready when the email OTP transport cannot authenticate.
    await mailer.verify();
    const row = await getSettings();
    return res.json({ ok: true, configured: true, version: '1.0.0', familyName: FAMILY_NAME, hasCredential: row.has_credential === true });
  } catch {
    return res.status(503).json({ ok: false, configured: false, version: '1.0.0', code: 'database_unavailable', message: 'پایگاه دادهٔ سرویس امنیت خانواده آماده نیست.' });
  }
});

app.post('/v1/auth/request-code', codeLimiter, async (req, res) => {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده هنوز پیکربندی نشده است.');
  const email = cleanEmail(req.body?.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) return replyError(res, 400, 'invalid_email', 'نشانی ایمیل معتبر وارد کن.');
  const parent = getParent(email);
  // Return the same response for unregistered addresses to avoid exposing the parent allow-list.
  const generic = { ok: true, message: 'اگر این ایمیل از قبل به‌عنوان پدر یا مادر خانواده ثبت شده باشد، کد تأیید ارسال می‌شود.' };
  if (!parent) return res.json(generic);
  try {
    const code = String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, '0');
    const codeHash = hmac(`otp:${email}:${code}`);
    const issued = await pool.query(
      `INSERT INTO family_auth_codes(email, code_hash, expires_at, attempts, last_sent_at)
       VALUES ($1, $2, now() + interval '10 minutes', 0, now())
       ON CONFLICT(email) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, last_sent_at = now()
       WHERE family_auth_codes.last_sent_at <= now() - interval '60 seconds'
       RETURNING email`,
      [email, codeHash],
    );
    if (!issued.rows[0]) return replyError(res, 429, 'otp_cooldown', 'برای ارسال دوبارهٔ کد، ۶۰ ثانیه صبر کن.');
    try {
      await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'کد تأیید امنیت خانوادگی کوروش نوا',
      text: `سلام ${parent.name}،\n\nکد یک‌بارمصرف ورود به مدیریت امنیت خانواده کوروش نوا: ${code}\n\nاین کد ۱۰ دقیقه اعتبار دارد و فقط برای ورود استفاده می‌شود. آن را با کسی به اشتراک نگذار. اگر این درخواست را انجام نداده‌ای، این پیام را نادیده بگیر.`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif"><h2>کوروش نوا · امنیت خانواده</h2><p>سلام ${escapeHtml(parent.name)}،</p><p>کد یک‌بارمصرف ورود به مدیریت امنیت:</p><h1 style="letter-spacing:5px">${code}</h1><p>کد تا ۱۰ دقیقه معتبر است. آن را با کسی به اشتراک نگذار.</p><small>اگر این درخواست را انجام نداده‌ای، پیام را نادیده بگیر.</small></div>`,
      });
    } catch (mailError) {
      await pool.query('DELETE FROM family_auth_codes WHERE email=$1 AND code_hash=$2', [email, codeHash]).catch(() => {});
      throw mailError;
    }
    return res.json(generic);
  } catch (error) {
    console.error('OTP request failed:', error?.message || error);
    return replyError(res, 503, 'email_delivery_failed', 'کد ایمیل ارسال نشد؛ تنظیمات سرویس ایمیل بررسی شود.');
  }
});
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

app.post('/v1/auth/verify-code', verifyLimiter, async (req, res) => {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده هنوز پیکربندی نشده است.');
  const email = cleanEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  const parent = getParent(email);
  if (!parent || !/^\d{6}$/.test(code)) return replyError(res, 401, 'invalid_code', 'ایمیل یا کد تأیید معتبر نیست.');
  try {
    if (!(await consumeOtp(email, code))) return replyError(res, 401, 'invalid_code', 'کد اشتباه است یا اعتبارش پایان یافته است.');
    const row = await getSettings();
    return res.json({
      token: issueToken(parent),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      profile: { role: parent.role, name: parent.name, isPrimary: parent.role === PRIMARY_ROLE },
      policyVersion: Number(row.policy_version || 1),
    });
  } catch {
    return replyError(res, 503, 'database_unavailable', 'ورود انجام نشد؛ سرویس پایگاه داده در دسترس نیست.');
  }
});


app.post('/v1/family/devices/admin-register', requireParent, async (req, res) => {
  const deviceId = String(req.body?.deviceId || '');
  if (!validDeviceId(deviceId)) return replyError(res, 400, 'invalid_device_id', 'شناسهٔ امن گوشی معتبر نیست.');
  try {
    const registered = await registerDevice({ deviceId, deviceName: req.body?.deviceName, role: 'admin', parentEmail: req.parent.email });
    return res.json({ ok: true, ...registered });
  } catch {
    return replyError(res, 503, 'device_register_failed', 'ثبت امن گوشی مدیر انجام نشد. مهاجرت‌های پایگاه داده را بررسی کن.');
  }
});

app.post('/v1/family/devices/pair-code', requireParent, async (req, res) => {
  try {
    const code = String(randomBytes(4).readUInt32BE(0) % 100000000).padStart(8, '0');
    const codeHash = hmac(`pair:${code}`);
    await pool.query('DELETE FROM family_pair_codes WHERE expires_at < now() OR consumed_at IS NOT NULL');
    await pool.query("INSERT INTO family_pair_codes(code_hash, created_by_email, expires_at, attempts) VALUES($1,$2,now()+interval '10 minutes',0)", [codeHash, req.parent.email]);
    return res.json({ ok: true, pairCode: code, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  } catch {
    return replyError(res, 503, 'pair_code_failed', 'کد اتصال گوشی ساخته نشد.');
  }
});

app.post('/v1/family/devices/enroll', codeLimiter, async (req, res) => {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده پیکربندی نشده است.');
  const pairCode = String(req.body?.pairCode || '').replace(/\s/g, '');
  const deviceId = String(req.body?.deviceId || '');
  if (!/^\d{8}$/.test(pairCode) || !validDeviceId(deviceId)) return replyError(res, 400, 'invalid_pairing', 'کد ۸ رقمی یا شناسهٔ گوشی معتبر نیست.');
  try {
    const result = await pool.query('SELECT * FROM family_pair_codes WHERE code_hash=$1 AND consumed_at IS NULL', [hmac(`pair:${pairCode}`)]);
    const row = result.rows[0];
    if (!row || Number(row.attempts) >= 5 || new Date(row.expires_at).getTime() < Date.now()) return replyError(res, 401, 'pair_code_invalid', 'کد اتصال معتبر نیست یا منقضی شده است. از والد کد تازه بگیر.');
    const consumed = await pool.query('UPDATE family_pair_codes SET consumed_at=now() WHERE code_hash=$1 AND consumed_at IS NULL AND expires_at > now() RETURNING code_hash', [row.code_hash]);
    if (!consumed.rows[0]) return replyError(res, 401, 'pair_code_used', 'این کد قبلاً استفاده شده است؛ از والد کد تازه بگیر.');
    const registered = await registerDevice({ deviceId, deviceName: req.body?.deviceName, role: 'member', parentEmail: row.created_by_email });
    if (!registered) return replyError(res, 409, 'device_already_registered', 'این شناسه قبلاً برای یک گوشی ثبت شده است؛ از همان گوشی یا شناسهٔ تازه استفاده کن.');
    const settings = await getSettings();
    return res.json({ ok: true, ...registered, policy: shapeSnapshot(settings, null) });
  } catch {
    return replyError(res, 503, 'device_enroll_failed', 'اتصال گوشی انجام نشد؛ وضعیت سرویس بررسی شود.');
  }
});

app.get('/v1/family/devices', requireParent, async (_req, res) => {
  try {
    const result = await pool.query('SELECT device_id, device_name, device_role, created_at, last_seen_at, created_by_email FROM family_devices WHERE revoked_at IS NULL ORDER BY created_at DESC');
    return res.json({ devices: result.rows.map((row) => ({ deviceId: row.device_id, deviceName: row.device_name, role: row.device_role, createdAt: row.created_at, lastSeenAt: row.last_seen_at, createdBy: maskEmail(row.created_by_email) })) });
  } catch {
    return replyError(res, 503, 'device_list_failed', 'فهرست گوشی‌های خانواده دریافت نشد.');
  }
});

app.post('/v1/family/devices/revoke', requireParent, async (req, res) => {
  const deviceId = String(req.body?.deviceId || '');
  if (!validDeviceId(deviceId)) return replyError(res, 400, 'invalid_device_id', 'شناسهٔ گوشی معتبر نیست.');
  try {
    const update = await pool.query('UPDATE family_devices SET revoked_at=now() WHERE device_id=$1 AND revoked_at IS NULL RETURNING device_id', [deviceId]);
    if (!update.rows[0]) return replyError(res, 404, 'device_not_found', 'گوشی فعال پیدا نشد.');
    return res.json({ ok: true });
  } catch {
    return replyError(res, 503, 'device_revoke_failed', 'لغو عضویت گوشی انجام نشد.');
  }
});

app.get('/v1/family/security/device-policy', requireDevice, async (_req, res) => {
  try { return res.json(shapeSnapshot(await getSettings(), null)); }
  catch { return replyError(res, 503, 'policy_unavailable', 'سیاست امنیتی خانواده دریافت نشد.'); }
});

app.post('/v1/family/security/verify-biometric', requireDevice, verifyLimiter, async (_req, res) => {
  try {
    const row = await getSettings();
    return res.json({ allowed: row.has_credential === true && row.biometric_allowed === true, policyVersion: Number(row.policy_version || 1) });
  } catch {
    return replyError(res, 503, 'biometric_policy_unavailable', 'اجازهٔ بیومتریک از سرور تأیید نشد.');
  }
});

app.get('/v1/family/security', requireParent, async (req, res) => {
  try { return res.json(shapeSnapshot(await getSettings(), req.parent)); }
  catch { return replyError(res, 503, 'database_unavailable', 'وضعیت امنیت خانواده خوانده نشد.'); }
});

app.put('/v1/family/security/policy', requireParent, async (req, res) => {
  const { authMethod, biometricAllowed, expectedPolicyVersion } = req.body || {};
  if (!KNOWN_METHODS.has(authMethod)) return replyError(res, 400, 'invalid_method', 'روش احراز هویت معتبر نیست.');
  if (typeof biometricAllowed !== 'boolean' || !Number.isInteger(expectedPolicyVersion)) return replyError(res, 400, 'invalid_policy', 'اطلاعات سیاست امنیتی ناقص است.');
  const options = validatedOptions(req.body?.options);
  try {
    const current = await getSettings();
    if (optionsKeys.some((key) => options[key]) && current.has_credential !== true) return replyError(res, 409, 'credential_required', 'ابتدا رمز مشترک خانواده را ثبت کن.');
    if (biometricAllowed && current.has_credential !== true) return replyError(res, 409, 'credential_required', 'برای فعال‌کردن بیومتریک، ابتدا رمز مشترک لازم است.');
    const updated = await pool.query(
      `UPDATE family_security_settings
       SET auth_method = $1, biometric_allowed = $2, security_options = $3::jsonb,
           policy_version = policy_version + 1, updated_at = now()
       WHERE singleton = true AND policy_version = $4
       RETURNING *`,
      [authMethod, biometricAllowed, JSON.stringify(options), expectedPolicyVersion],
    );
    if (!updated.rows[0]) return replyError(res, 409, 'policy_conflict', 'سیاست خانواده روی گوشی دیگری تغییر کرده؛ ابتدا وضعیت تازه را همگام کن.');
    return res.json(shapeSnapshot(updated.rows[0], req.parent));
  } catch {
    return replyError(res, 503, 'database_unavailable', 'سیاست امنیتی ذخیره نشد؛ هیچ انتخابی تأییدشده تلقی نمی‌شود.');
  }
});

app.put('/v1/family/security/credential', requireParent, async (req, res) => {
  const method = String(req.body?.method || '');
  const pin = String(req.body?.pin || '');
  const pattern = String(req.body?.pattern || '');
  const currentPin = String(req.body?.currentPin || '');
  const expectedPolicyVersion = Number(req.body?.expectedPolicyVersion);
  if (!Number.isInteger(expectedPolicyVersion)) return replyError(res, 400, 'invalid_policy_version', 'نسخهٔ سیاست امنیتی مشخص نیست؛ وضعیت تازه را دریافت کن.');
  if (!KNOWN_METHODS.has(method)) return replyError(res, 400, 'invalid_method', 'روش احراز هویت معتبر نیست.');
  if (!/^\d{6,8}$/.test(pin)) return replyError(res, 400, 'invalid_pin', 'رمز پشتیبان باید ۶ تا ۸ رقم باشد.');
  const nodes = pattern ? pattern.split('-') : [];
  if (method === 'pattern' && (nodes.length < 4 || nodes.length > 9 || nodes.some((v) => !/^[0-8]$/.test(v)) || new Set(nodes).size !== nodes.length)) {
    return replyError(res, 400, 'invalid_pattern', 'الگو باید شامل ۴ تا ۹ نقطهٔ متفاوت باشد.');
  }
  try {
    const existing = await getSettings();
    if (Number(existing.policy_version) !== expectedPolicyVersion) return replyError(res, 409, 'policy_conflict', 'سیاست خانواده تغییر کرده؛ وضعیت تازه را همگام و دوباره تلاش کن.');
    if (existing.has_credential === true && !(await compareSecret(currentPin, existing.pin_salt, existing.pin_hash))) {
      return replyError(res, 401, 'current_credential_required', 'برای تغییر رمز، ابتدا PIN فعلی مشترک را درست وارد کن.');
    }
    const pinCredential = await derive(pin);
    const patternCredential = method === 'pattern' ? await derive(pattern) : { salt: null, hash: null };
    const recoveryCode = makeRecoveryCode();
    const recoveryCredential = await derive(normalizeRecovery(recoveryCode));
    const result = await pool.query(
      `UPDATE family_security_settings SET
         auth_method = $1, biometric_allowed = $2, has_credential = true,
         pin_salt = $3, pin_hash = $4, pattern_salt = $5, pattern_hash = $6,
         recovery_salt = $7, recovery_hash = $8,
         policy_version = policy_version + 1, updated_at = now()
       WHERE singleton = true AND policy_version = $9 RETURNING *`,
      [method, method === 'biometric', pinCredential.salt, pinCredential.hash, patternCredential.salt, patternCredential.hash, recoveryCredential.salt, recoveryCredential.hash, expectedPolicyVersion],
    );
    if (!result.rows[0]) return replyError(res, 409, 'policy_conflict', 'سیاست خانواده هم‌زمان تغییر کرد؛ وضعیت تازه را دوباره دریافت کن.');
    return res.json({ ok: true, hasCredential: true, authMethod: method, biometricAllowed: method === 'biometric', recoveryCode, policyVersion: Number(result.rows[0].policy_version) });
  } catch {
    return replyError(res, 503, 'credential_save_failed', 'ذخیرهٔ امن اطلاعات ورود انجام نشد.');
  }
});

app.post('/v1/family/security/verify', requireDevice, verifyLimiter, async (req, res) => {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده پیکربندی نشده است.');
  const kind = String(req.body?.kind || '');
  const value = String(req.body?.value || '');
  const deviceId = String(req.familyDevice?.device_id || '');
  const clientIp = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const subject = createHash('sha256').update(`${clientIp}:${deviceId}`).digest('hex');
  if (!['pin', 'pattern'].includes(kind) || !deviceId || String(req.body?.deviceId || '') !== deviceId || !value) return replyError(res, 400, 'invalid_credential', 'اطلاعات ورود معتبر نیست.');
  try {
    const failure = await pool.query('SELECT attempts, blocked_until FROM family_security_failures WHERE subject_key=$1', [subject]);
    const failRow = failure.rows[0];
    if (failRow?.blocked_until && new Date(failRow.blocked_until).getTime() > Date.now()) return replyError(res, 429, 'temporary_lockout', 'تلاش‌های ناموفق زیاد شده؛ بعداً دوباره تلاش کن.');
    const row = await getSettings();
    let verified = false;
    if (row.has_credential === true && kind === 'pin') verified = await compareSecret(value, row.pin_salt, row.pin_hash);
    if (row.has_credential === true && kind === 'pattern' && row.pattern_hash) verified = await compareSecret(value, row.pattern_salt, row.pattern_hash);
    if (verified) {
      await pool.query('DELETE FROM family_security_failures WHERE subject_key=$1', [subject]);
      return res.json({ verified: true, policyVersion: Number(row.policy_version) });
    }
    const attempts = Number(failRow?.attempts || 0) + 1;
    const blockedSeconds = attempts >= 5 ? Math.min(900, 30 * (2 ** Math.min(attempts - 5, 5))) : null;
    await pool.query(
      `INSERT INTO family_security_failures(subject_key, attempts, blocked_until, updated_at)
       VALUES($1, $2, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + ($3::text || ' seconds')::interval END, now())
       ON CONFLICT(subject_key) DO UPDATE SET attempts=EXCLUDED.attempts, blocked_until=EXCLUDED.blocked_until, updated_at=now()`,
      [subject, attempts, blockedSeconds],
    );
    return res.json({ verified: false });
  } catch {
    return replyError(res, 503, 'verification_unavailable', 'تأیید رمز مشترک انجام نشد؛ وقتی سرویس در دسترس نیست، قفل تأییدشده فرض نمی‌شود.');
  }
});

app.post('/v1/family/security/recover', verifyLimiter, async (req, res) => {
  if (!appReady) return replyError(res, 503, 'service_unconfigured', 'سرویس مرکزی امنیت خانواده پیکربندی نشده است.');
  const email = cleanEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();
  const recoveryCode = normalizeRecovery(req.body?.recoveryCode);
  const newPin = String(req.body?.newPin || '');
  if (!getParent(email) || !/^\d{6}$/.test(otp) || recoveryCode.length !== 20 || !/^\d{6,8}$/.test(newPin)) return replyError(res, 400, 'invalid_recovery', 'اطلاعات بازیابی معتبر نیست.');
  try {
    if (!(await consumeOtp(email, otp))) return replyError(res, 401, 'invalid_otp', 'کد ایمیل اشتباه است یا اعتبارش پایان یافته است.');
    const row = await getSettings();
    if (!row.recovery_hash || !(await compareSecret(recoveryCode, row.recovery_salt, row.recovery_hash))) return replyError(res, 401, 'invalid_recovery_code', 'کد بازیابی معتبر نیست.');
    const pinCredential = await derive(newPin);
    const newRecoveryCode = makeRecoveryCode();
    const recoveryCredential = await derive(normalizeRecovery(newRecoveryCode));
    const update = await pool.query(
      `UPDATE family_security_settings SET auth_method='pin', biometric_allowed=false,
         has_credential=true, pin_salt=$1, pin_hash=$2, pattern_salt=NULL, pattern_hash=NULL,
         recovery_salt=$3, recovery_hash=$4, policy_version=policy_version+1, updated_at=now()
       WHERE singleton=true RETURNING policy_version`,
      [pinCredential.salt, pinCredential.hash, recoveryCredential.salt, recoveryCredential.hash],
    );
    return res.json({ ok: true, recoveryCode: newRecoveryCode, policyVersion: Number(update.rows[0].policy_version) });
  } catch {
    return replyError(res, 503, 'recovery_failed', 'بازیابی امن انجام نشد؛ هیچ رمز جدیدی اعمال نشده است.');
  }
});

app.use((_req, res) => replyError(res, 404, 'not_found', 'مسیر درخواست‌شده وجود ندارد.'));
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err?.message || err);
  return replyError(res, 500, 'internal_error', 'درخواست با خطای داخلی روبه‌رو شد.');
});

app.listen(PORT, () => {
  console.log(`Korosh Nova Family Security API listening on ${PORT}; ready=${appReady}`);
  if (!appReady) console.warn('Set database, a 32+ byte SESSION_SECRET, one or two pre-approved parent emails, primary owner role, and SMTP before app use.');
});
