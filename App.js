import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';

const CONFIG = {
  brandName: 'اسپیکر هوشمند نوا',
  deviceName: 'اسپیکر هوشمند نوا',
  aiName: 'زهره؛ هوش نوا',
  signature: 'یک خاطره، یک زندگی، یک صدا...',
  projectLine: 'اسپیکر هوشمند نوا • سیستم هوشمند',
  splashTime: 5000,
  musicVisual: { size: 210, rotateWhilePlaying: true },
  storageKey: '@noba_settings_v2',
  musicSearch: {
    enabled: true,
    provider: 'Secure backend',
    backendUrl: process.env.EXPO_PUBLIC_AI_BACKEND_URL || '',
  },
  programmableLights: { galaxyEffects: 30, outerNeonEffects: 20 },
};

const PAGES = {
  control: 'اتاق فرمان',
  bluetooth: 'بلوتوث نوا',
  usb: 'آرشیو نوا (USB)',
  music: 'آوای نوا',
  rgb: 'هاله نور',
  galaxy: 'کهکشان نوا',
  ai: CONFIG.aiName,
  settings: 'اتاق فرمان',
};

const NAV_ITEMS = [
  ['bluetooth', 'بلوتوث'],
  ['usb', 'گنجینه'],
  ['music', 'آوای نوا'],
  ['rgb', 'هاله نور'],
  ['galaxy', 'کهکشانی'],
  ['ai', 'زهره'],
  ['control', 'اتاق فرمان'],
];

const TOP_ICONS = { bluetooth: null, usb: '◈', music: '♫', rgb: '◉', galaxy: '✧', ai: '✦', control: '⌘' };
const NAV_PRESETS = {
  bluetooth: [require('./assets/nav_icons/bluetooth_0.png'), require('./assets/nav_icons/bluetooth_1.png'), require('./assets/nav_icons/bluetooth_2.png'), require('./assets/nav_icons/bluetooth_3.png'), require('./assets/nav_icons/bluetooth_4.png')],
  usb: [require('./assets/nav_icons/usb_0.png'), require('./assets/nav_icons/usb_1.png'), require('./assets/nav_icons/usb_2.png'), require('./assets/nav_icons/usb_3.png'), require('./assets/nav_icons/usb_4.png')],
  music: [require('./assets/nav_icons/music_0.png'), require('./assets/nav_icons/music_1.png'), require('./assets/nav_icons/music_2.png'), require('./assets/nav_icons/music_3.png'), require('./assets/nav_icons/music_4.png')],
  rgb: [require('./assets/nav_icons/rgb_0.png'), require('./assets/nav_icons/rgb_1.png'), require('./assets/nav_icons/rgb_2.png'), require('./assets/nav_icons/rgb_3.png'), require('./assets/nav_icons/rgb_4.png')],
  galaxy: [require('./assets/nav_icons/galaxy_0.png'), require('./assets/nav_icons/galaxy_1.png'), require('./assets/nav_icons/galaxy_2.png'), require('./assets/nav_icons/galaxy_3.png'), require('./assets/nav_icons/galaxy_4.png')],
  ai: [require('./assets/nav_icons/ai_0.png'), require('./assets/nav_icons/ai_1.png'), require('./assets/nav_icons/ai_2.png'), require('./assets/nav_icons/ai_3.png'), require('./assets/nav_icons/ai_4.png')],
  control: [require('./assets/nav_icons/control_0.png'), require('./assets/nav_icons/control_1.png'), require('./assets/nav_icons/control_2.png'), require('./assets/nav_icons/control_3.png'), require('./assets/nav_icons/control_4.png')],
};
// Header identity is intentionally fixed: users can customize ordinary controls,
// but each page keeps one curated animated emblem so the app identity cannot be
// accidentally replaced or broken from settings.
const FIXED_HEADER_PRESETS = {
  bluetooth: 0,
  usb: 3,
  music: 2,
  rgb: 4,
  galaxy: 1,
  ai: 3,
  control: 0,
};

const PAGE_THEMES = {
  bluetooth: {
    palette: ['#45e8ff', '#5f7bff', '#75ffc8', '#9fb4ff', '#45d6ff'],
    glow: '#45e8ff', glow2: '#6f63ff', bg: 'rgba(6,25,55,0.92)',
    shapes: [0, 3, 1, 4, 2],
  },
  usb: {
    palette: ['#ffd166', '#ff9f5a', '#69e6c7', '#c2f970', '#ffe5a0'],
    glow: '#ffd166', glow2: '#64e1b7', bg: 'rgba(35,27,12,0.92)',
    shapes: [3, 1, 4, 2, 0],
  },
  music: {
    palette: ['#ff5fd2', '#ff8f70', '#c47dff', '#65e8ff', '#ffd16a'],
    glow: '#ff5fd2', glow2: '#7f76ff', bg: 'rgba(39,13,37,0.92)',
    shapes: [2, 4, 0, 3, 1],
  },
  rgb: {
    palette: ['#ff4fd8', '#55efff', '#a9ff4f', '#ffd85c', '#8f7dff'],
    glow: '#55efff', glow2: '#ff4fd8', bg: 'rgba(15,18,42,0.92)',
    shapes: [1, 3, 4, 0, 2],
  },
  galaxy: {
    palette: ['#8c7dff', '#d77cff', '#58d9ff', '#ff79c8', '#9cffea'],
    glow: '#8c7dff', glow2: '#d77cff', bg: 'rgba(25,10,55,0.92)',
    shapes: [4, 2, 1, 3, 0],
  },
  ai: {
    palette: ['#63f0c1', '#f7cf70', '#6aa8ff', '#d88cff', '#eaf5a4'],
    glow: '#63f0c1', glow2: '#f7cf70', bg: 'rgba(8,34,33,0.92)',
    shapes: [3, 0, 4, 1, 2],
  },
  control: {
    palette: ['#b28cff', '#79e8ff', '#ff86cf', '#ffd66d', '#8dffbd'],
    glow: '#b28cff', glow2: '#79e8ff', bg: 'rgba(17,18,50,0.92)',
    shapes: [0, 1, 2, 3, 4],
  },
  equalizer: {
    palette: ['#64f5ff', '#a78bff', '#ff6fca', '#ffd166', '#72ffc5'],
    glow: '#64f5ff', glow2: '#a78bff', bg: 'rgba(8,18,42,0.94)',
    shapes: [1, 3, 0, 4, 2],
  },
};
const VisualThemeContext = React.createContext('control');
const KOROSH_NOVA_LOGO = require('./assets/icon.png');
const APP_ICON_CHOICES = [
  ['noba_default', 'نوا اصلی', require('./assets/app_icons/noba_default.png')],
  ['noba_cyan', 'نوا یخی', require('./assets/app_icons/noba_cyan.png')],
  ['noba_violet', 'نوا بنفش', require('./assets/app_icons/noba_violet.png')],
  ['noba_pink', 'نوا صورتی', require('./assets/app_icons/noba_pink.png')],
];

const BACKGROUND_PRESETS = {
  bluetooth: [require('./assets/backgrounds/bluetooth_0.jpg'), require('./assets/backgrounds/bluetooth_1.jpg'), require('./assets/backgrounds/bluetooth_2.jpg'), require('./assets/backgrounds/bluetooth_3.jpg'), require('./assets/backgrounds/bluetooth_4.jpg')],
  usb: [require('./assets/backgrounds/usb_0.jpg'), require('./assets/backgrounds/usb_1.jpg'), require('./assets/backgrounds/usb_2.jpg'), require('./assets/backgrounds/usb_3.jpg'), require('./assets/backgrounds/usb_4.jpg')],
  music: [require('./assets/backgrounds/music_0.jpg'), require('./assets/backgrounds/music_1.jpg'), require('./assets/backgrounds/music_2.jpg'), require('./assets/backgrounds/music_3.jpg'), require('./assets/backgrounds/music_4.jpg')],
  rgb: [require('./assets/backgrounds/rgb_0.jpg'), require('./assets/backgrounds/rgb_1.jpg'), require('./assets/backgrounds/rgb_2.jpg'), require('./assets/backgrounds/rgb_3.jpg'), require('./assets/backgrounds/rgb_4.jpg')],
  galaxy: [require('./assets/backgrounds/galaxy_0.jpg'), require('./assets/backgrounds/galaxy_1.jpg'), require('./assets/backgrounds/galaxy_2.jpg'), require('./assets/backgrounds/galaxy_3.jpg'), require('./assets/backgrounds/galaxy_4.jpg')],
  ai: [require('./assets/backgrounds/ai_0.jpg'), require('./assets/backgrounds/ai_1.jpg'), require('./assets/backgrounds/ai_2.jpg'), require('./assets/backgrounds/ai_3.jpg'), require('./assets/backgrounds/ai_4.jpg')],
  control: [require('./assets/backgrounds/control_0.jpg'), require('./assets/backgrounds/control_1.jpg'), require('./assets/backgrounds/control_2.jpg'), require('./assets/backgrounds/control_3.jpg'), require('./assets/backgrounds/control_4.jpg')],
};
const MUSIC_EFFECTS = ['rotate','orbit','wave'];
const MUSIC_EFFECT_NAMES = ['چرخش کهکشانی','مدار نور','موج آوا'];

async function securityBackend(endpoint, body, method='POST') {
  const base = CONFIG.musicSearch.backendUrl;
  if (!base) throw new Error('BACKEND_NOT_CONFIGURED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body || {}) }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

async function verifyGlobalSecurityPin(pin) {
  try {
    const data = await securityBackend('/api/security/pin/verify', { pin });
    return data.valid === true;
  } catch (error) {
    if (error?.message !== 'BACKEND_NOT_CONFIGURED') return false;
    const local = await AsyncStorage.getItem('@noba_local_security_pin');
    return local ? local === String(pin) : null;
  }
}

async function changeGlobalSecurityPin(currentPin, newPin) {
  try {
    const result = await securityBackend('/api/security/pin/change', { currentPin, newPin });
    await AsyncStorage.setItem('@noba_local_security_pin', String(newPin));
    return result;
  } catch (error) {
    if (error?.message !== 'BACKEND_NOT_CONFIGURED') throw error;
    const local = await AsyncStorage.getItem('@noba_local_security_pin');
    if (local && local !== String(currentPin)) throw new Error('LOCAL_PIN_INVALID');
    await AsyncStorage.setItem('@noba_local_security_pin', String(newPin));
    return { localOnly: true };
  }
}
const MUSIC_PRESETS = [require('./assets/music_presets/music_0.jpg'), require('./assets/music_presets/music_1.jpg'), require('./assets/music_presets/music_2.jpg')];

const STATUS_PHRASES = {
  powerOn: ['نوا بیدار شد.', 'نوا آماده است.', 'نوا برگشت.', 'نوا روشن شد؛ من اینجام.', 'نوا با توست.'],
  powerOff: ['نوا به خواب می‌رود.', 'تا دیدار بعد.', 'نوا آرام می‌گیرد.', 'نوا فعلاً می‌خوابد.', 'نوا خاموش شد؛ تا بعد.'],
  bluetooth: ['گنجینه ارتباط فعال است.', 'دروازه نوا باز شد.', 'پیوند نوا برقرار است.', 'نوا در مدار بلوتوث است.', 'راه ارتباط نوا باز است.'],
  bluetoothExit: ['از دروازه بلوتوث خارج شدی.', 'پیوند بلوتوث بسته شد.', 'نوا از مدار بلوتوث خارج شد.', 'دروازه ارتباط بسته شد.', 'بلوتوث به خواب رفت.'],
  usb: ['گنجینه آوا فعال است.', 'دروازه نوا باز شد.', 'گنجینه نوا آماده است.', 'آرشیو نوا بیدار شد.', 'راه نوا باز است.'],
  usbExit: ['گنجینه نوا بسته شد.', 'از آرشیو نوا خارج شدی.', 'دروازه نوا بسته شد.', 'آرشیو نوا به خواب رفت.', 'گنجینه آوا آرام گرفت.'],
  online: ['نوا آنلاین شد.', 'راه نوا به هوش باز شد.', 'زهره بیدار است.', 'پیوند هوش برقرار شد.', 'نوا به شبکه رسید.'],
  delivered: ['پیام رسید.', 'پیام تحویل شد.', 'زهره پیام را گرفت.', 'پیام در گنجینه ثبت شد.', 'پیام به نوا رسید.'],
};

const DEFAULT_SETTINGS = {
  visualDefaultsVersion: 6,
  logoUri: null,
  logoLocked: true,
  appIconChoice: 'noba_fixed',
  appIconLocked: true,
  appIconGalleryUri: null,
  appIconGalleryLocked: true, musicImageUri: null, musicImagePreset: 0, musicImageMode: 'preset', musicVisualEffect: 'rotate', musicUri: null, musicName: null, musicPlaylist: [], musicLibraryImported: false, usbDirectoryUri: null, usbMusicPlaylist: [], usbMusicImported: false,
  buttonIcons: {}, buttonIconPreset: Object.fromEntries(NAV_ITEMS.map(([k]) => [k, 0])),
  backgroundUri: null, bluetoothHeroUri: null, bluetoothHeroPreset: 0, pageBackgrounds: {}, pageBackgroundPreset: { bluetooth: 0, usb: 2, music: 4, rgb: 1, galaxy: 3, ai: 2, control: 4 },
  uiThemePreset: 0, buttonGlowPreset: 0,
  powerOnSound: null, powerOffSound: null, powerOnPreset: 0, powerOffPreset: 0, powerSoundMode: { on: 'preset', off: 'preset' }, statusSoundPresets: { bluetooth: 0, bluetoothExit: 0, usb: 0, usbExit: 0, online: 0, delivered: 0 }, statusSounds: { bluetooth: null, bluetoothExit: null, usb: null, usbExit: null, online: null, delivered: null }, statusSoundEnabled: { powerOn: true, powerOff: true, bluetooth: true, bluetoothExit: true, usb: true, usbExit: true, online: true, delivered: true }, powerSoundEnabled: { on: true, off: true },
  speakerPowered: true, lightTransportMode: 'auto',
  aiVoiceProfile: 'female', aiOutput: 'phone', aiConnection: 'wifi', aiMode: 'online', aiPersonality: 'friendly',
  lightSettings: { rgb: { brightness: 75, speed: 55, color: '#7f8cff', effect: 0, neonEffect: 0, dance: false, enabled: true }, galaxy: { brightness: 80, speed: 45, color: '#9b7cff', effect: 0, wheelTop: false, wheelBottom: false } }, equalizer: { preset: 0, bass: 55, mid: 50, treble: 65, style: 'spectrum' },
  securityEnabled: false, securityPin: null, securityBiometricEnabled: false, securityProtectedPages: { control: false, ai: false, cellular: false, contacts: false, sensors: false, camera: false, emergencyCamera: false },
  safetyEnabled: true, emergencySmsEnabled: true, emergencyContactName: '', emergencyContactPhone: '',
  emergencyAckPhrase: 'دریافت شد', emergencyRepeatMinutes: 5, emergencyCameraEnabled: true, emergencyCameraMinutes: 15,
  futureCamera: { quality: '1080p', storage: 'usb', flashMode: 'auto', dedicatedUsb: true, lightPort: 'dedicated', storagePort: 'usb-host', autoRecord: false, storageLabel: '', usbDirectoryUri: null, usbChunkSeconds: 60 },
  hardwareModules: { smoke: true, gas: true, co: true, climate: true, cellular: true, emergencyCamera: true },
  transportMode: 'auto', wifiMode: 'local', wifiConnected: false, wifiHost: '192.168.4.1', wifiPort: '8080', bluetoothName: 'Noba',
  moduleType: '', moduleId: '', modulePort: '', moduleBaud: '115200', moduleAutoDetect: true, hardwarePowerEnabled: true,
  bluetoothTransport: { mode: 'auto', module: 'هسته داخلی', address: '', serviceUuid: '', characteristicUuid: '', serialPort: '', baud: '115200' },
  sensorModules: { smoke: true, gas: true, co: true, climate: true },
  aiUpgrade: { provider: 'groq', endpoint: '', model: 'openai/gpt-oss-20b', memory: true, voiceEngine: 'female', profile: 'zohreh' },
};

function mergeSettings(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(saved)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) out[key] = mergeSettings(base[key], value);
    else out[key] = value;
  }
  if (Number(saved.visualDefaultsVersion || 0) < 3) {
    // Keep a user's explicit/custom background choices. Only fill missing page keys.
    const defaults = { bluetooth: 0, usb: 2, music: 4, rgb: 1, galaxy: 3, ai: 2, control: 4 };
    out.pageBackgroundPreset = { ...defaults, ...(saved.pageBackgroundPreset || {}) };
    out.visualDefaultsVersion = 3;
  }
  if (Number(saved.visualDefaultsVersion || 0) < 4) {
    // The control-room tab should behave like the other bottom tabs: opening it must not hide the bottom navigation.
    out.securityProtectedPages = { ...(out.securityProtectedPages || {}), control: false };
    out.equalizer = { ...(out.equalizer || {}), style: out.equalizer?.style || 'spectrum' };
    out.visualDefaultsVersion = 4;
  }
  if (Number(saved.visualDefaultsVersion || 0) < 5) {
    // USB music is a separate library so it never replaces the phone library.
    out.usbDirectoryUri = saved.usbDirectoryUri || null;
    out.usbMusicPlaylist = Array.isArray(saved.usbMusicPlaylist) ? saved.usbMusicPlaylist : [];
    out.usbMusicImported = false;
    out.visualDefaultsVersion = 5;
  }
  if (Number(saved.visualDefaultsVersion || 0) < 6) {
    // Keep the phone artwork selector valid after reducing it to three presets and three distinct effects.
    out.musicImagePreset = Math.max(0, Math.min(2, Number(saved.musicImagePreset) || 0));
    out.musicVisualEffect = ['rotate','orbit','wave'].includes(saved.musicVisualEffect) ? saved.musicVisualEffect : 'rotate';
    out.visualDefaultsVersion = 6;
  }
  // Temporary audit mode: disable all security/lock prompts even if an older install saved them as enabled.
  out.securityEnabled = false;
  out.securityBiometricEnabled = false;
  out.securityProtectedPages = { control:false, ai:false, cellular:false, contacts:false, sensors:false, camera:false, emergencyCamera:false };
  return out;
}

async function persistLocalFile(uri, name = 'media') {
  if (!uri) return uri;
  try {
    const base = String(name).replace(/[^a-zA-Z0-9._-]+/g, '_') || 'media';
    const extMatch = String(uri).match(/\.[a-zA-Z0-9]{1,5}(?:\?|$)/);
    const ext = extMatch ? extMatch[0].replace('?', '') : '';
    const target = `${FileSystem.documentDirectory}noba_${Date.now()}_${base}${ext}`;
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch (_) {
    return uri;
  }
}

const MUSIC_ENGINE = { player: null, uri: null, source: null, statusSub: null, listener: null, playlist: [], index: 0, phonePlaylist: [], usbPlaylist: [], phoneIndex: 0, usbIndex: 0 };

async function playStoredSound(sound) {
  if (!sound?.uri) return false;
  try {
    const p = createAudioPlayer({ uri: sound.uri });
    const sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) { try { sub?.remove(); } catch (_) {} try { p.release(); } catch (_) {} }
    });
    p.play();
    return true;
  } catch (_) { return false; }
}

let femaleVoiceCache = null;
async function getFemaleVoice() {
  if (femaleVoiceCache) return femaleVoiceCache;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const fa = (voices || []).filter(v => String(v.language || '').toLowerCase().startsWith('fa'));
    const candidates = fa.length ? fa : (voices || []).filter(v => String(v.language || '').toLowerCase().startsWith('en'));
    femaleVoiceCache = candidates.find(v => /female|woman|zira|sahar|female/i.test(`${v.name || ''} ${v.identifier || ''}`)) || candidates[0] || null;
  } catch (_) { femaleVoiceCache = null; }
  return femaleVoiceCache;
}
async function speakWithFemale(text) {
  const voice = await getFemaleVoice();
  Speech.stop();
  Speech.speak(text || '', { language: voice?.language || 'fa-IR', voice: voice?.identifier, rate: 0.96, pitch: 1.05 });
}
async function speakStatus(settings, key) {
  if (settings?.statusSoundEnabled?.[key] === false) return;
  const list = STATUS_PHRASES[key] || [];
  const index = Number(settings?.statusSoundPresets?.[key]) || 0;
  await speakWithFemale(list[index]);
}

async function speakPower(settings, on) {
  const side = on ? 'on' : 'off';
  if (settings?.powerSoundEnabled?.[side] === false) return;
  const mode = settings?.powerSoundMode?.[side] || 'preset';
  if (mode === 'off') return;
  if (mode === 'custom') {
    const sound = on ? settings?.powerOnSound : settings?.powerOffSound;
    if (await playStoredSound(sound)) return;
  }
  const list = STATUS_PHRASES[on ? 'powerOn' : 'powerOff'];
  const index = Number(settings?.[on ? 'powerOnPreset' : 'powerOffPreset']) || 0;
  await speakWithFemale(list[index]);
}

async function sendLightCommand(settings, payload) {
  if (!settings || (settings.lightTransportMode === 'bluetooth')) return false;
  const host = String(settings.wifiHost || '').trim();
  const port = String(settings.wifiPort || '8080').trim();
  if (!host) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);
    const res = await fetch(`http://${host}:${port}/api/lights`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (_) { return false; }
}
async function sendPowerCommand(settings, powered) {
  if (!settings || settings.transportMode === 'bluetooth' || settings.lightTransportMode === 'bluetooth') return false;
  const host = String(settings.wifiHost || '').trim();
  const port = String(settings.wifiPort || '8080').trim();
  if (!host) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`http://${host}:${port}/api/power`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ powered: Boolean(powered) }), signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch (_) { return false; }
}
async function checkWifiConnection(settings) {
  const host = String(settings?.wifiHost || '').trim();
  const port = String(settings?.wifiPort || '8080').trim();
  if (!host) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    const res = await fetch(`http://${host}:${port}/api/status`, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (_) { return false; }
}

export default function App() {
  const [page, setPage] = useState('splash');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(false);
  const [unlockedProtectedPage, setUnlockedProtectedPage] = useState(null);
  const [pendingProtectedPage, setPendingProtectedPage] = useState('control');
  const [signal, setSignal] = useState(null);
  const [speakerPowered, setSpeakerPowered] = useState(DEFAULT_SETTINGS.speakerPowered);
  const previousPageRef = useRef('splash');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CONFIG.storageKey);
        if (raw && alive) {
          const merged=mergeSettings(DEFAULT_SETTINGS, JSON.parse(raw));
          delete merged.splashBackgroundUri;
          delete merged.splashBackgroundPreset;
          setSettings(merged);
          setSpeakerPowered(merged.speakerPowered !== false);
          // The launcher icon is bundled in the build and intentionally fixed so every distributed copy is identical.

        }
      } catch (_) {}
    })();
    const timer = setTimeout(() => alive && setPage('bluetooth'), CONFIG.splashTime);
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CONFIG.storageKey, JSON.stringify({ ...settings, speakerPowered })).catch(() => {});
  }, [settings, speakerPowered]);

  useEffect(() => {
    const prev = previousPageRef.current;
    if (page !== prev) {
      if (page === 'bluetooth' && prev !== 'bluetooth') speakStatus(settings, 'bluetooth');
      if (prev === 'bluetooth' && page !== 'bluetooth' && page !== 'splash') speakStatus(settings, 'bluetoothExit');
      if (page === 'usb' && prev !== 'usb') speakStatus(settings, 'usb');
      if (prev === 'usb' && page !== 'usb' && page !== 'splash') speakStatus(settings, 'usbExit');
      previousPageRef.current = page;
    }
  }, [page, settings]);

  useEffect(() => {
    // Audio session: keep music stable in background and prevent voice replies from mixing with music.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const toggleSpeakerPower = async () => {
    const next = !speakerPowered;
    setSpeakerPowered(next);
    update({ speakerPowered: next });
    if (!next) { try { MUSIC_ENGINE.player?.pause(); } catch (_) {} Speech.stop(); }
    await sendPowerCommand({ ...settings, speakerPowered: next }, next);
    await speakPower({ ...settings, speakerPowered: next }, next);
  };
  const open = (next) => { const target = next === 'settings' ? 'control' : next; const protectedPage = ['control','ai','camera','sensors','cellular','contacts','emergencyCamera'].includes(target) && (settings.securityProtectedPages?.[target] !== false); if (protectedPage && settings.securityEnabled && unlockedProtectedPage !== target) { setPendingProtectedPage(target); setPage('pin'); return; } if (!protectedPage) { setSensitiveUnlocked(false); setUnlockedProtectedPage(null); } setPage(next); };
  const pulseSignal = (kind) => { setSignal({ kind, at: Date.now() }); setTimeout(() => setSignal(null), 2600); };

  const common = {
    settings,
    onSettings: () => open('control'),
    onBack: () => open('home'),
    open,
    update, pulseSignal, sensitiveUnlocked, setSensitiveUnlocked, speakerPowered, toggleSpeakerPower,
    verifyGlobalSecurityPin, changeGlobalSecurityPin,
  };

  if (page === 'splash') return <Splash settings={settings} />;
  if (page === 'pin') return <PinPage settings={settings} pendingPage={pendingProtectedPage} verifyGlobalSecurityPin={verifyGlobalSecurityPin} onUnlock={(target) => { const unlockedTarget = target || pendingProtectedPage || 'control'; setSensitiveUnlocked(true); setUnlockedProtectedPage(unlockedTarget); setPage(unlockedTarget); }} onBack={() => setPage('home')} />;

  let content;
  if (page === 'control') content = <SettingsPage {...common} />;
  else if (page === 'music') content = <MusicPage {...common} />;
  else if (page === 'ai') content = <ZohrehPage {...common} />;
  else if (page === 'settings') content = <SettingsPage {...common} />;
  else if (page === 'camera') content = <CameraPage settings={settings} update={update} onBack={() => open('control')} />;
  else if (page === 'bluetooth') content = <BluetoothPage {...common} />;
  else if (page === 'usb') content = <UsbPage {...common} />;
  else if (page === 'rgb') content = <LightingLabPage {...common} mode="rgb" />;
  else if (page === 'galaxy') content = <GalaxyPage {...common} />;
  else if (page === 'equalizer') content = <EqualizerPage {...common} />;
  else if (page === 'sensors') content = <SensorsPage {...common} />;
  else if (page !== 'home') content = <FeaturePage pageKey={page} title={PAGES[page]} text="" />;
  else content = <Home logoUri={settings.logoUri} onOpen={open} />;

  return (
    <View style={styles.root}>
      <PageBackdrop page={page === 'home' ? 'control' : page} settings={settings} />
      <View pointerEvents="none" style={styles.backgroundShade} />
      {content}
      {signal && <SignalFlash kind={signal.kind} />}
      <BottomNav page={page} onOpen={open} settings={settings} />
    </View>
  );
}

function Splash({ settings }) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;
  const glow = useRef(new Animated.Value(0.55)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const signatureRise = useRef(new Animated.Value(0)).current;
  const background = BACKGROUND_PRESETS.galaxy[0];
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 12000, useNativeDriver: true })).start(),
      Animated.loop(Animated.sequence([Animated.timing(glow,{toValue:1,duration:1700,useNativeDriver:true}),Animated.timing(glow,{toValue:0.55,duration:1700,useNativeDriver:true})])).start(),
      Animated.loop(Animated.sequence([Animated.timing(shimmer,{toValue:1,duration:2200,useNativeDriver:true}),Animated.timing(shimmer,{toValue:0,duration:2200,useNativeDriver:true})])).start(),
      Animated.timing(signatureRise,{toValue:1,duration:4800,useNativeDriver:true}),
    ]).start();
  }, [spin, scale, glow, shimmer, signatureRise]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const tilt = spin.interpolate({ inputRange: [0, .5, 1], outputRange: ['-2deg', '2deg', '-2deg'] });
  return (
    <View style={styles.splash}>
      <Image source={background} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
      <View style={styles.splashShade} />
      <Animated.View style={[styles.splashOrbitOuter,{opacity:glow,transform:[{rotate}]}]} />
      <Animated.View style={[styles.splash3D, { transform: [{ perspective: 700 }, { rotateY: rotate }, { scale }] }]}>
        <View style={styles.splashLogoAura} />
        <Image source={KOROSH_NOVA_LOGO} style={styles.splashImage} />
      </Animated.View>
      <Animated.View style={[styles.splashIdentity,{transform:[{rotate:tilt}],opacity:shimmer.interpolate({inputRange:[0,1],outputRange:[0.86,1]})}]}>
        <Text style={styles.splashNoba}>نوا</Text>
        <Text style={styles.splashKorosh}>کوروش نوا</Text>
      </Animated.View>
      <Animated.View style={[styles.splashSignature,{transform:[{translateY:signatureRise.interpolate({inputRange:[0,1],outputRange:[0,-320]})}],opacity:signatureRise.interpolate({inputRange:[0,0.12,0.9,1],outputRange:[0,0.95,1,0.0]})}]}><Text style={styles.splashSignatureText}>{CONFIG.signature}</Text></Animated.View>
    </View>
  );
}

function Home({ logoUri, onOpen }) {
  return (
    <View style={styles.container}>
      <Image source={KOROSH_NOVA_LOGO} style={styles.homeLogo} />
      <Text style={styles.brand}>{CONFIG.brandName}</Text>
      <Text style={styles.device}>دستگاه {CONFIG.deviceName}</Text>
      <View style={styles.homeHero}><Text style={styles.homeHeroGlyph}>◈</Text><Text style={styles.homeHeroTitle}>آماده‌ی فرمان</Text><Text style={styles.homeHeroText}>همه‌ی مسیرهای نوا از نوار پایین در دسترس‌اند.</Text></View>
    </View>
  );
}

function FeaturePage({ pageKey, title, text, fixedLogo, logoUri }) {
  return <PageShell pageKey={pageKey} title={title} fixedLogo={fixedLogo} logoUri={logoUri}><View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{text}</Text></View></PageShell>;
}

function ControlPage({ onBack, onSettings, settings }) {
  return (
    <PageShell title="اتاق فرمان نوا" onBack={onBack}>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>شخصی‌سازی</Text>
        
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>صدای روشن / خاموش</Text>
        
      </View>
      <MenuButton title="باز کردن تنظیمات کامل" onPress={onSettings} />
    </PageShell>
  );
}

async function scanDeviceMusic() {
  try {
    const permission = await MediaLibrary.getPermissionsAsync(false, ['audio']);
    const granted = permission.granted ? permission : await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    if (!granted.granted) return { granted: false, tracks: [] };
    let after = undefined, tracks = [];
    for (let page = 0; page < 20; page += 1) {
      const res = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 1000, after });
      tracks = tracks.concat((res.assets || []).map(a => ({ uri: a.uri, name: a.filename || 'آهنگ', duration: a.duration || 0 })));
      if (!res.hasNextPage || !res.endCursor) break;
      after = res.endCursor;
    }
    return { granted: true, tracks };
  } catch (_) { return { granted: false, tracks: [] }; }
}

async function scanUsbMusic(directoryUri) {
  if (!directoryUri) return { granted: false, tracks: [] };
  const SAF = FileSystem.StorageAccessFramework;
  const audioExt = /\.(mp3|m4a|aac|wav|flac|ogg|opus|wma|aiff|amr)$/i;
  const tracks = [];
  const queue = [{ uri: directoryUri, depth: 0 }];
  const seen = new Set();
  try {
    while (queue.length && tracks.length < 500) {
      const { uri, depth } = queue.shift();
      if (seen.has(uri) || depth > 3) continue;
      seen.add(uri);
      const entries = await SAF.readDirectoryAsync(uri);
      for (const entry of entries || []) {
        if (tracks.length >= 500) break;
        const rawName = decodeURIComponent(String(entry).split('/').pop() || '').replace(/%2F/gi, '/');
        let info = null;
        try { info = await FileSystem.getInfoAsync(entry); } catch (_) {}
        if (info?.isDirectory && depth < 3) {
          queue.push({ uri: entry, depth: depth + 1 });
        } else if (audioExt.test(rawName)) {
          tracks.push({ uri: entry, name: rawName || 'آهنگ USB', duration: 0, source: 'usb' });
        }
      }
    }
    return { granted: true, tracks };
  } catch (_) {
    return { granted: false, tracks: [] };
  }
}

function MusicArtwork({ source, playing, effect, size=190 }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) { pulse.stopAnimation(); wave.stopAnimation(); spin.stopAnimation(); return; }
    pulse.setValue(0); wave.setValue(0); spin.setValue(0);
    const a = Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:900,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:900,useNativeDriver:true})]));
    const b = Animated.loop(Animated.timing(wave,{toValue:1,duration:2200,useNativeDriver:true}));
    const c = Animated.loop(Animated.timing(spin,{toValue:1,duration:14000,useNativeDriver:true}));
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [playing, pulse, wave, spin]);
  const scale = pulse.interpolate({inputRange:[0,1],outputRange:[1,1.035]});
  const ringScale = pulse.interpolate({inputRange:[0,1],outputRange:[0.94,1.10]});
  const waveRotate = wave.interpolate({inputRange:[0,1],outputRange:['-5deg','5deg']});
  const rotate = spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const orbitRotate = wave.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <View style={[styles.musicArtworkStage,{width:size+32,height:size+32}]}>
    <Animated.View style={[styles.musicHaloRing,{width:size+20,height:size+20,borderRadius:(size+20)/2,transform:[{scale:effect==='wave'?ringScale:1}],opacity:playing?0.95:0.45}]}/>
    {effect==='wave' && <Animated.View style={[styles.musicWaveAura,{transform:[{rotate:waveRotate}],opacity:playing?1:0.42}]}>{[0,1,2,3,4,5,6].map(i=>{
      const barScale = wave.interpolate({inputRange:[0,0.5,1],outputRange:[0.65+(i%3)*0.12,1.12-(i%2)*0.10,0.65+(i%3)*0.12]});
      return <Animated.View key={i} style={[styles.musicWaveBar,{height:22+(i%3)*14,transform:[{scaleY:barScale}]}]}/>;
    })}</Animated.View>}
    {effect==='orbit' && <Animated.View style={[styles.musicOrbitRing,{transform:[{rotate:orbitRotate}]}]}><View style={styles.musicOrbitDot}/></Animated.View>}
    <Animated.View style={[styles.musicImageFrame,{width:size,height:size,borderRadius:size/2,transform:[{scale:effect==='wave'?scale:1},{rotate}]}]}>
      <Image source={source} resizeMode="contain" style={[styles.musicImage,{width:size,height:size,borderRadius:size/2}]}/>
    </Animated.View>
  </View>;
}

function MusicPage({ onBack, onSettings, settings, update }) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(Math.max(0, Number(MUSIC_ENGINE.index) || 0));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressWidth, setProgressWidth] = useState(1);
  const [webQuery, setWebQuery] = useState('');
  const spin = useRef(new Animated.Value(0)).current;
  const musicEffect = settings.musicVisualEffect || MUSIC_EFFECTS[Math.max(0,Math.min(2,Number(settings.musicImagePreset)||0))] || 'rotate';
  const playlist = settings.musicPlaylist?.length ? settings.musicPlaylist : (settings.musicUri ? [{ uri: settings.musicUri, name: settings.musicName || 'آهنگ' }] : []);
  const current = playlist[index] || playlist[0];

  useEffect(() => {
    let alive = true;
    if (!settings.musicLibraryImported) {
      scanDeviceMusic().then(result => {
        if (!alive || !result.granted) return;
        const existing = Array.isArray(settings.musicPlaylist) ? settings.musicPlaylist : [];
        const merged = [...result.tracks, ...existing.filter(x => !result.tracks.some(y => y.uri === x.uri))];
        update({ musicPlaylist: merged, musicUri: merged[0]?.uri || settings.musicUri || null, musicName: merged[0]?.name || settings.musicName || null, musicLibraryImported: true });
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [settings.musicLibraryImported]);

  useEffect(() => {
    MUSIC_ENGINE.phonePlaylist = playlist;
    if (MUSIC_ENGINE.phoneIndex >= playlist.length && playlist.length) MUSIC_ENGINE.phoneIndex = 0;
    if (MUSIC_ENGINE.source === 'phone') {
      MUSIC_ENGINE.playlist = playlist;
      MUSIC_ENGINE.index = MUSIC_ENGINE.phoneIndex;
      setIndex(Math.max(0, Math.min(MUSIC_ENGINE.phoneIndex || 0, Math.max(0, playlist.length - 1))));
    } else {
      setPlaying(false);
    }
    const statusHandler = (status) => {
      if (MUSIC_ENGINE.source !== 'phone') { setPlaying(false); return; }
      setCurrentTime(Number(status?.currentTime) || 0);
      setDuration(Number(status?.duration) || 0);
      setPlaying(Boolean(status?.playing));
      if (status?.didJustFinish) {
        const list = MUSIC_ENGINE.playlist || [];
        if (list.length > 1) {
          const ni = (MUSIC_ENGINE.index + 1) % list.length;
          MUSIC_ENGINE.index = ni;
          MUSIC_ENGINE.phoneIndex = ni;
          setIndex(ni);
          const item = list[ni];
          if (item?.uri) {
            loadGlobalMusic(item, settings.musicImageUri, 'phone', list, ni);
            try { MUSIC_ENGINE.player?.play(); } catch (_) {}
          }
        } else setPlaying(false);
      }
    };
    MUSIC_ENGINE.listener = statusHandler;
    if (MUSIC_ENGINE.player) {
      setPlaying(Boolean(MUSIC_ENGINE.player.playing));
      setCurrentTime(Number(MUSIC_ENGINE.player.currentTime) || 0);
      setDuration(Number(MUSIC_ENGINE.player.duration) || 0);
    }
    return () => { if (MUSIC_ENGINE.listener === statusHandler) MUSIC_ENGINE.listener = null; };
  }, [settings.musicPlaylist, settings.musicUri, settings.musicName, settings.musicImageUri]);

  useEffect(() => {
    const req = settings.autoplayRequest;
    if (!req?.uri) return;
    const ni = Math.max(0, playlist.findIndex(x => x.uri === req.uri));
    MUSIC_ENGINE.index = ni;
    MUSIC_ENGINE.phoneIndex = ni;
    setIndex(ni);
    loadGlobalMusic(req, settings.musicImageUri, 'phone', playlist, ni);
    try { MUSIC_ENGINE.player?.play(); setPlaying(true); } catch (_) {}
    update({ autoplayRequest: null });
  }, [settings.autoplayRequest?.at]);

  useEffect(() => {
    if (!playing) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [playing, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const playItem = (item, ni = index) => {
    if (!item) { Alert.alert('آوای نوا', 'اول یک آهنگ انتخاب کن.'); return; }
    MUSIC_ENGINE.index = ni;
    setIndex(ni);
    MUSIC_ENGINE.phoneIndex = ni;
    loadGlobalMusic(item, settings.musicImageUri, 'phone', playlist, ni);
    try { MUSIC_ENGINE.player?.play(); setPlaying(true); } catch (_) { Alert.alert('خطای پخش', 'این فایل قابل پخش نیست.'); }
  };
  const playCurrent = () => playItem(current, index);
  const pause = () => { try { MUSIC_ENGINE.player?.pause(); } catch (_) {} setPlaying(false); };
  const next = () => { if (playlist.length) { const ni=(index+1)%playlist.length; playItem(playlist[ni],ni); } };
  const prev = () => { if (playlist.length) { const ni=(index-1+playlist.length)%playlist.length; playItem(playlist[ni],ni); } };
  const seek = async (ratio) => {
    const d = Number(duration) || Number(MUSIC_ENGINE.player?.duration) || 0;
    if (!d) return;
    const target = Math.max(0, Math.min(d, ratio * d));
    try { await MUSIC_ENGINE.player?.seekTo(target); setCurrentTime(target); } catch (_) {}
  };
  const fmt = (v) => { const n=Math.max(0,Math.floor(Number(v)||0)); return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; };
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <PageShell pageKey="music" title="آوای نوا" onBack={onBack} settings={settings}>
      <MusicArtwork source={settings.musicImageUri ? { uri: settings.musicImageUri } : MUSIC_PRESETS[Math.max(0,Math.min(2,Number(settings.musicImagePreset)||0))]} playing={playing} effect={musicEffect} size={190} />
      <Text style={styles.nowPlaying}>{current?.name || 'هیچ آهنگی انتخاب نشده'}</Text>
      <View style={styles.musicProgressWrap}>
        <Pressable onPress={(e)=>seek(Math.max(0,Math.min(1,(e.nativeEvent.locationX||0)/Math.max(1,progressWidth))))} onLayout={(e)=>setProgressWidth(e.nativeEvent.layout.width)} style={styles.musicProgressTrack}>
          <View style={[styles.musicProgressFill,{width:`${progress*100}%`}]} />
          <View style={[styles.musicProgressOrb,{left:`${Math.max(0,Math.min(100,progress*100))}%`}]} />
        </Pressable>
        <View style={styles.timeRow}><Text style={styles.timeText}>{fmt(currentTime)}</Text><Text style={styles.timeText}>{fmt(duration)}</Text></View>
      </View>
      <View style={styles.musicControls}>
        <CosmicControlButton icon="⏮" label="آهنگ قبلی" onPress={prev} />
        <CosmicControlButton icon={playing ? 'Ⅱ' : '▶'} label={playing ? 'مکث' : 'پخش آهنگ'} active={playing} onPress={playing ? pause : playCurrent} large />
        <CosmicControlButton icon="⏭" label="آهنگ بعدی" onPress={next} />
      </View>
      <CosmicControlButton icon="■" label="استاپ کامل" onPress={()=>{try{MUSIC_ENGINE.player?.pause(); MUSIC_ENGINE.player?.seekTo(0);}catch(_){} setPlaying(false);}} />
      <View style={styles.card}><TextInput value={webQuery} onChangeText={setWebQuery} placeholder="نام آهنگ یا خواننده" placeholderTextColor="#77809a" style={styles.searchInput}/><View style={styles.choiceRow}><MenuButton title="انتخاب آهنگ" compact onPress={onSettings} /><MenuButton title="بازخوانی گوشی" compact onPress={async()=>{const r=await scanDeviceMusic(); if(!r.granted){Alert.alert('اجازه لازم است','برای آوردن آهنگ‌های گوشی، اجازه دسترسی به فایل‌های صوتی را فعال کن.');return;} const existing=Array.isArray(settings.musicPlaylist)?settings.musicPlaylist:[]; const merged=[...r.tracks,...existing.filter(x=>!r.tracks.some(y=>y.uri===x.uri))]; update({musicPlaylist:merged,musicUri:merged[0]?.uri||null,musicName:merged[0]?.name||null,musicLibraryImported:true});}} /><MenuButton title="جست‌وجوی گوگل" compact onPress={()=>Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(webQuery.trim() || current?.name || 'آهنگ')}`).catch(()=>{})} /></View></View>
      <View style={styles.card}>{playlist.map((x, i) => <CosmicPlaylistItem key={`${x.uri}-${i}`} title={x.name} index={i + 1} active={i === index} onPress={() => playItem(x,i)} />)}</View>
    </PageShell>
  );
}

function loadGlobalMusic(item, artworkUri, source='phone', playlist=[], index=0) {
  if (!item?.uri) return null;
  const switchingSource = MUSIC_ENGINE.source && MUSIC_ENGINE.source !== source;
  if (switchingSource) {
    try { MUSIC_ENGINE.player?.pause(); } catch (_) {}
  }
  if (!MUSIC_ENGINE.player || MUSIC_ENGINE.uri !== item.uri) {
    try { MUSIC_ENGINE.statusSub?.remove(); } catch (_) {}
    try { MUSIC_ENGINE.player?.clearLockScreenControls(); } catch (_) {}
    try { MUSIC_ENGINE.player?.release(); } catch (_) {}
    MUSIC_ENGINE.player = createAudioPlayer({ uri: item.uri, updateInterval: 250 });
    MUSIC_ENGINE.uri = item.uri;
    MUSIC_ENGINE.statusSub = MUSIC_ENGINE.player.addListener('playbackStatusUpdate', (status) => {
      try { MUSIC_ENGINE.listener?.(status); } catch (_) {}
    });
  }
  MUSIC_ENGINE.source = source;
  MUSIC_ENGINE.playlist = Array.isArray(playlist) ? playlist : [];
  MUSIC_ENGINE.index = Number.isFinite(index) ? index : 0;
  if (source === 'phone') { MUSIC_ENGINE.phonePlaylist = MUSIC_ENGINE.playlist; MUSIC_ENGINE.phoneIndex = MUSIC_ENGINE.index; }
  if (source === 'usb') { MUSIC_ENGINE.usbPlaylist = MUSIC_ENGINE.playlist; MUSIC_ENGINE.usbIndex = MUSIC_ENGINE.index; }
  try {
    MUSIC_ENGINE.player.setActiveForLockScreen(true, { title: item.name || (source === 'usb' ? 'آوای USB' : 'آوای نوا'), artist: 'نوا', albumTitle: source === 'usb' ? 'گنجینه USB' : 'آوای نوا', artworkUrl: artworkUri || undefined }, { showSeekBackward: true, showSeekForward: true });
  } catch (_) {}
  return MUSIC_ENGINE.player;
}

function UsbPage({ onBack, pulseSignal, settings, update }) {
  const [connected, setConnected] = useState(Boolean(settings.usbDirectoryUri));
  const [tracks, setTracks] = useState(Array.isArray(settings.usbMusicPlaylist) ? settings.usbMusicPlaylist : []);
  const [scanning, setScanning] = useState(false);
  const [playingUri, setPlayingUri] = useState(MUSIC_ENGINE.source === 'usb' ? MUSIC_ENGINE.uri : null);

  const chooseUsb = async () => {
    try {
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(settings.usbDirectoryUri || undefined);
      if (!result.granted) return;
      update({ usbDirectoryUri: result.directoryUri, usbMusicImported: false });
      setConnected(true);
      pulseSignal?.('online');
      await refreshUsb(result.directoryUri);
    } catch (_) {
      Alert.alert('فلش نوا', 'انتخاب محل فلش انجام نشد. اگر فلش با OTG وصل است، دوباره تلاش کن.');
    }
  };
  const refreshUsb = async (uri = settings.usbDirectoryUri) => {
    if (!uri) { await chooseUsb(); return; }
    setScanning(true);
    const result = await scanUsbMusic(uri);
    setScanning(false);
    if (!result.granted) {
      Alert.alert('فلش نوا', 'خواندن فایل‌های فلش ممکن نشد؛ دسترسی پوشه را دوباره انتخاب کن.');
      return;
    }
    setTracks(result.tracks);
    update({ usbMusicPlaylist: result.tracks, usbMusicImported: true });
  };
  useEffect(() => {
    if (settings.usbDirectoryUri && !settings.usbMusicImported) refreshUsb(settings.usbDirectoryUri);
  }, [settings.usbDirectoryUri]);
  useEffect(() => {
    MUSIC_ENGINE.usbPlaylist = tracks;
    if (MUSIC_ENGINE.source === 'usb') {
      setPlayingUri(MUSIC_ENGINE.uri);
      MUSIC_ENGINE.playlist = tracks;
      MUSIC_ENGINE.index = Math.max(0, Math.min(MUSIC_ENGINE.usbIndex || 0, Math.max(0, tracks.length - 1)));
    } else setPlayingUri(null);
    const statusHandler = (status) => {
      if (MUSIC_ENGINE.source !== 'usb') { setPlayingUri(null); return; }
      setPlayingUri(status?.playing ? MUSIC_ENGINE.uri : null);
      if (status?.didJustFinish) {
        const list = MUSIC_ENGINE.playlist || [];
        if (list.length > 1) {
          const ni = (MUSIC_ENGINE.index + 1) % list.length;
          MUSIC_ENGINE.index = ni;
          MUSIC_ENGINE.usbIndex = ni;
          const item = list[ni];
          if (item?.uri) {
            loadGlobalMusic(item, settings.musicImageUri, 'usb', list, ni);
            try { MUSIC_ENGINE.player?.play(); } catch (_) {}
            setPlayingUri(item.uri);
          }
        } else setPlayingUri(null);
      }
    };
    MUSIC_ENGINE.listener = statusHandler;
    return () => { if (MUSIC_ENGINE.listener === statusHandler) MUSIC_ENGINE.listener = null; };
  }, [tracks, settings.musicImageUri]);
  const play = (item, i) => {
    MUSIC_ENGINE.index = i;
    MUSIC_ENGINE.usbIndex = i;
    MUSIC_ENGINE.playlist = tracks;
    loadGlobalMusic(item, settings.musicImageUri, 'usb', tracks, i);
    try { MUSIC_ENGINE.player?.play(); setPlayingUri(item.uri); } catch (_) { Alert.alert('خطای پخش', 'این فایل USB قابل پخش نیست.'); }
  };
  return (
    <PageShell pageKey="usb" title="گنجینه آواهای نوا" onBack={onBack} settings={settings}>
      <View style={styles.usbCore}>
        <View style={[styles.usbOrb, connected && styles.usbOrbConnected]}><Text style={styles.usbGlyph}>◈</Text></View>
        <Text style={styles.usbState}>{connected ? `${tracks.length} آهنگ در گنجینه پیدا شد.` : 'فلش منتظر پیوند است.'}</Text>
      </View>
      <View style={styles.choiceRow}>
        <MenuButton title={connected ? 'تغییر فلش / پوشه' : 'انتخاب فلش USB'} compact onPress={chooseUsb} />
        <MenuButton title={scanning ? 'در حال خواندن…' : 'بازخوانی آهنگ‌ها'} compact onPress={() => refreshUsb()} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>آهنگ‌های داخل USB</Text>
        {!tracks.length && <Text style={styles.smallHint}>بعد از اتصال فلش و انتخاب پوشه، فایل‌های صوتی اینجا نمایش داده می‌شوند.</Text>}
        {tracks.map((x, i) => <CosmicPlaylistItem key={`${x.uri}-${i}`} title={x.name} index={i + 1} active={playingUri === x.uri} onPress={() => play(x, i)} />)}
      </View>
    </PageShell>
  );
}

function ZohrehPage({ onBack, open, update, settings, pulseSignal }) {
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [response, setResponse] = useState('آماده‌ام. می‌توانی مثل یک گفت‌وگوی طبیعی با من حرف بزنی.');
  const [songQuery, setSongQuery] = useState('');
  const [safetyState, setSafetyState] = useState('green');
  const pulse = useRef(new Animated.Value(0)).current;
  const historyRef = useRef([]);
  const latestTranscriptRef = useRef('');
  const voiceSessionRef = useRef(false);
  const sendValueRef = useRef(null);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useSpeechRecognitionEvent('start', () => { voiceSessionRef.current = true; latestTranscriptRef.current = ''; setVoiceActive(true); setSpeaking(false); });
  useSpeechRecognitionEvent('end', () => {
    const shouldSend = voiceSessionRef.current; const transcript = latestTranscriptRef.current.trim();
    voiceSessionRef.current = false; setVoiceActive(false);
    if (shouldSend && transcript) sendValueRef.current?.(transcript, true);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript || '';
    if (transcript) { latestTranscriptRef.current = transcript; setText(transcript); }
  });
  useSpeechRecognitionEvent('error', (event) => { setVoiceActive(false); if (event.error !== 'aborted') setResponse('تشخیص گفتار روی این دستگاه در دسترس نیست؛ می‌توانی دستی بنویسی.'); });

  const offlineCommand = (value) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (/چراغ|نور/.test(v) && /روشن/.test(v)) return 'OFFLINE:LIGHTS_ON';
    if (/چراغ|نور/.test(v) && /خاموش/.test(v)) return 'OFFLINE:LIGHTS_OFF';
    if (/کهکشان/.test(v) && /روشن/.test(v)) return 'OFFLINE:GALAXY_ON';
    if (/نئون/.test(v) && /روشن/.test(v)) return 'OFFLINE:NEON_ON';
    if (/پخش|آهنگ/.test(v) && /پخش/.test(v)) return 'OFFLINE:PLAY';
    if (/مکث|توقف/.test(v)) return 'OFFLINE:PAUSE';
    return null;
  };

  const callBackend = async (endpoint, body) => {
    const backendUrl = CONFIG.musicSearch.backendUrl;
    if (!backendUrl) throw new Error('BACKEND_NOT_CONFIGURED');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`); return data;
    } finally { clearTimeout(timeout); }
  };

  const speakAnswer = (answer) => {
    const profiles = { female: { rate: 0.95, pitch: 1.04 }, male: { rate: 0.92, pitch: 0.86 }, teen: { rate: 0.98, pitch: 1.12 } };
    const voice = profiles[settings.aiVoiceProfile] || profiles.female;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(answer, {
      language: 'fa-IR', rate: voice.rate, pitch: voice.pitch,
      onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false),
    });
  };

  const sendValue = async (value, fromVoice = false) => {
    if (!value?.trim() || (processing && !fromVoice)) return;
    const clean = value.trim();
    if (!fromVoice && processing) return;
    const command = offlineCommand(clean);
    if (command) {
      setResponse(`فرمان آماده اجرا شد: ${command.replace('OFFLINE:', '')}`);
      setText('');
      return;
    }
    setProcessing(true); setResponse('زهره در حال فکر کردن است...');
    try {
      const data = await callBackend('/api/chat', { text: clean, history: historyRef.current, language: 'fa-IR', mode: settings.aiMode || 'online', connection: settings.aiConnection || 'wifi', output: settings.aiOutput || 'phone', personality: settings.aiPersonality || 'friendly' });
      pulseSignal('online');
      const answer = String(data.text || '').trim(); if (!answer) throw new Error('EMPTY_AI_RESPONSE');
      historyRef.current = [...historyRef.current.slice(-9), { role: 'user', content: clean }, { role: 'assistant', content: answer }];
      setResponse(answer); setText(''); pulseSignal('delivered');
      if (settings.aiMode !== 'offline') {
        if (settings.aiOutput === 'speaker') {
          setResponse(answer);
        } else {
          speakAnswer(answer);
        }
      }
    } catch (error) {
      setResponse(error?.message === 'BACKEND_NOT_CONFIGURED' ? 'هوش آنلاین هنوز متصل نشده است.' : 'ارتباط با هوش آنلاین برقرار نشد؛ می‌توانی دوباره امتحان کنی.');
    } finally { setProcessing(false); }
  };
  sendValueRef.current = sendValue;

  const startVoice = async () => {
    // شروع گفت‌وگوی صوتی، حتی وسط پاسخ زهره؛ مثل مکالمه تلفنی.
    Speech.stop(); setSpeaking(false);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert('دسترسی لازم است', 'برای میکروفون و تشخیص گفتار اجازه بده.'); return; }
      ExpoSpeechRecognitionModule.start({ lang: 'fa-IR', interimResults: true, continuous: false });
    } catch (_) { setResponse('تشخیص گفتار روی این دستگاه در دسترس نیست.'); }
  };
  const releaseVoice = () => { if (!voiceSessionRef.current && !voiceActive) return; try { ExpoSpeechRecognitionModule.stop(); } catch (_) {} };

  const coreScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.05] });

  return (
    <PageShell pageKey="ai" title="زهره" onBack={onBack} settings={settings}>
      <View style={styles.aiHero}>
        <Animated.View style={[styles.aiRing, styles.aiRingOuter, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
        <Animated.View style={[styles.aiRing, styles.aiRingMid, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
        <Animated.View style={[styles.aiCore, { transform: [{ scale: voiceActive ? coreScale : 1 }] }]}>
          <View style={styles.aiCoreOrbit}><Text style={styles.aiCoreGlyph}>✦</Text></View>
        </Animated.View>
        <Text style={styles.aiState}>{voiceActive ? 'زهره گوش می‌دهد' : speaking ? 'زهره پاسخ می‌دهد — هر وقت خواستی وسطش حرف بزن' : 'آماده گفت‌وگو'}</Text>
      </View>

      <View style={styles.safetyStrip}>
        <View style={[styles.safetyDot, safetyState === 'green' ? styles.green : safetyState === 'yellow' ? styles.yellow : styles.red]} />
        <Text style={styles.safetyText}>{safetyState === 'green' ? 'وضعیت عادی' : safetyState === 'yellow' ? 'هشدار' : 'وضعیت اضطراری'}</Text>
      </View>

      <View style={styles.inputBar}>
        <TextInput value={text} onChangeText={setText} editable={!processing} placeholder="اینجا بنویس..." placeholderTextColor="#77809a" style={styles.input} multiline />
        <AIActionButton icon="➤" label="ارسال پیام به زهره" disabled={processing || !text.trim()} onPress={() => sendValue(text)} />
      </View>

      <AIListenButton active={voiceActive} onPressIn={startVoice} onPressOut={releaseVoice} />

      <View style={styles.voiceRow}>
        {[['female','زن','◉'],['male','مرد','◎'],['teen','جوان','◇']].map(([key,label,glyph],i) => <AIChoiceButton key={key} index={i} glyph={glyph} label={label} active={settings.aiVoiceProfile === key} onPress={() => update({ aiVoiceProfile: key })} />)}
      </View>
      <View style={styles.personalityRing}>{[['friendly','صمیمی','♡'],['smart','باهوش','✦'],['calm','آرام','≈'],['playful','شوخ','◌'],['serious','رسمی','◇']].map(([key,label,glyph],i) => <AIChoiceButton key={key} index={i + 1} glyph={glyph} label={label} active={settings.aiPersonality === key} onPress={() => update({ aiPersonality: key })} />)}</View>
      <View style={styles.voiceRow}>
        {[['phone','گوشی','⌂'],['speaker','نوا','◈']].map(([key,label,glyph],i) => <AIChoiceButton key={key} index={i + 6} glyph={glyph} label={label} active={settings.aiOutput === key} onPress={() => update({ aiOutput: key })} />)}
      </View>

      <Text style={styles.aiResponse}>{response}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>زهره و آهنگ</Text>
        <TextInput value={songQuery} onChangeText={setSongQuery} placeholder="نام آهنگ یا خواننده" placeholderTextColor="#77809a" style={styles.searchInput} editable={!processing} />
        <MenuButton title="جست‌وجو و پخش" onPress={async () => { if (!songQuery.trim() || processing) return; setProcessing(true); try { const data = await callBackend('/api/music-search', { query: songQuery.trim() }); const r = data.result || data; if (r.uri) { const song={uri:r.uri,name:r.title||songQuery.trim()}; const old=Array.isArray(settings.musicPlaylist)?settings.musicPlaylist:[]; update({musicPlaylist:[song,...old.filter(x=>x.uri!==song.uri)],musicUri:song.uri,musicName:song.name,autoplayRequest:{...song,at:Date.now()}}); setResponse(`«${song.name}» برای پخش آماده شد.`); setTimeout(()=>open('music'),250); } else setResponse(r.message||'نتیجه قابل پخش پیدا نشد.'); } catch(_) { setResponse('جست‌وجوی آهنگ انجام نشد.'); } finally { setProcessing(false); } }} />
      </View>
    </PageShell>
  );
}


function SliderLike({ value, onChange }) {
  const [width,setWidth]=useState(1);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const setFromEvent = (e) => { const x=e.nativeEvent.locationX; onChange(clamp((x/Math.max(1,width))*100)); };
  const responder = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder:()=>true, onMoveShouldSetPanResponder:()=>true, onPanResponderGrant:setFromEvent, onPanResponderMove:setFromEvent }), [onChange,width]);
  return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers} style={styles.sliderTrack}><View style={[styles.sliderFill,{width:`${clamp(value)}%`}]} /><View style={[styles.sliderKnob,{left:`${clamp(value)}%`}]} /><View style={styles.sliderDots}>{[0,25,50,75,100].map(x=><View key={x} style={styles.sliderDot}/>)}</View></View>;
}

function VerticalEQColumn({ label, value, color, onChange }) {
  const [height,setHeight]=useState(190);
  const clamp=(n)=>Math.max(0,Math.min(100,Math.round(n)));
  const setFromEvent=(e)=>{ const y=Number(e?.nativeEvent?.locationY)||0; onChange(clamp((1-y/Math.max(1,height))*100)); };
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:setFromEvent,onPanResponderMove:setFromEvent}),[height]);
  return <View style={styles.eqColumnWrap}>
    <Text style={styles.eqVerticalLabel}>{label}</Text>
    <View onLayout={e=>setHeight(e.nativeEvent.layout.height)} {...responder.panHandlers} style={styles.eqVerticalTrack}>
      <View style={[styles.eqVerticalFill,{height:`${clamp(value)}%`,backgroundColor:color,shadowColor:color}]}/><View style={[styles.eqVerticalGlow,{bottom:`${clamp(value)}%`,backgroundColor:color,shadowColor:color}]}/><View style={[styles.eqVerticalValue,{bottom:`${clamp(value)}%`,borderColor:color}]} />
    </View>
    <Text style={[styles.eqVerticalPercent,{color}]}>{clamp(value)}٪</Text>
  </View>;
}

function EqualizerPage({ onBack, settings, update }) {
  const eq=settings.equalizer||DEFAULT_SETTINGS.equalizer;
  const patch=(p)=>update({equalizer:{...eq,...p}});
  const presets=[['مدار آرام',40,50,42],['کهکشان',58,54,72],['نبض شب',72,48,64],['ستاره شفاف',52,68,78],['عمق سینمایی',82,46,58]];
  const style=eq.style||'bars';
  const colors=PAGE_THEMES.equalizer.palette;
  return <PageShell pageKey="equalizer" title="اکولایزر آوا" onBack={onBack} settings={settings}>
    <View style={styles.eqStyleSwitch}><CosmicTabButton glyph="◈" label="ستون‌های زنده" active={style==='bars'} onPress={()=>patch({style:'bars'})}/><CosmicTabButton glyph="▥" label="ستون‌های طیفی" active={style==='spectrum'} onPress={()=>patch({style:'spectrum'})}/></View>
    <View style={[styles.eqColumnsVisual,style==='spectrum'&&styles.eqColumnsSpectrum]}>
      <VerticalEQColumn label="بیس" value={eq.bass} color={colors[0]} onChange={v=>patch({bass:v})}/><VerticalEQColumn label="مید" value={eq.mid} color={colors[2]} onChange={v=>patch({mid:v})}/><VerticalEQColumn label="تریبل" value={eq.treble} color={colors[3]} onChange={v=>patch({treble:v})}/>
    </View>
    <View style={styles.card}><Text style={styles.cardTitle}>پروفایل‌های آوایی</Text><View style={styles.eqPresetGrid}>{presets.map(([name,b,m,t],i)=><CosmicControlButton key={name} icon={['✦','◈','☄','✧','◌'][i]} label={name} active={eq.preset===i} onPress={()=>patch({preset:i,bass:b,mid:m,treble:t})}/>)}</View></View>
    <Text style={styles.smallHint}>سه ستون عمودی قابل لمس هستند؛ با کشیدن هر ستون، بیس، مید و تریبل مستقیم کم و زیاد می‌شوند.</Text>
  </PageShell>;
}

function SensorsPage({ onBack, settings, update }) {
  const items=[['smoke','حس شفق'],['gas','حس مه'],['co','حس سایه'],['climate','حس اقلیم']];
  const sensorModules=settings.sensorModules||DEFAULT_SETTINGS.sensorModules;
  return <PageShell pageKey="control" title="حسگرهای نوا" onBack={onBack} settings={settings}>
    <View style={styles.sensorGrid}>{items.map(([key,label],i)=><CosmicControlButton key={key} icon={['✦','◌','◇','≈'][i]} label={label} active={sensorModules[key]!==false} onPress={()=>update({sensorModules:{...sensorModules,[key]:sensorModules[key]===false}})} large/>)}</View>
  </PageShell>;
}

function PinPage({ settings, onUnlock, onBack, verifyGlobalSecurityPin }) {
  const [pin,setPin]=useState('');
  const [checking,setChecking]=useState(false);
  useEffect(()=>{ if(!settings.securityBiometricEnabled) return; (async()=>{try{const r=await LocalAuthentication.authenticateAsync({promptMessage:'قفل نوا',cancelLabel:'ورود با رمز',disableDeviceFallback:false}); if(r.success) onUnlock();}catch(_){}})(); },[]);
  const submit=async()=>{
    if (checking) return;
    setChecking(true);
    try {
      const remote = await verifyGlobalSecurityPin(pin);
      if (remote === true) { onUnlock(); return; }
      if (remote === null) { Alert.alert('قفل نوا در دسترس نیست','برای استفاده از رمز مشترک، ارتباط با هستهٔ امنیتی نوا برقرار نیست.'); return; }
      setPin(''); Alert.alert('رمز نادرست','رمز مشترک نوا صحیح نیست.');
    } finally { setChecking(false); }
  };
  const biometric=async()=>{try{const r=await LocalAuthentication.authenticateAsync({promptMessage:'قفل نوا',cancelLabel:'ورود با رمز',disableDeviceFallback:false});if(r.success)onUnlock();}catch(_){}};
  return <View style={styles.pinScreen}><View style={styles.pinOrb}><Text style={styles.pinGlyph}>✦</Text></View><Text style={styles.pinTitle}>قفل نوا</Text><TextInput value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" style={styles.pinInput} placeholder="رمز مشترک نوا" placeholderTextColor="#77809a"/><View style={styles.choiceRow}><MenuButton title={checking?'بررسی…':'باز کردن'} onPress={submit}/>{settings.securityBiometricEnabled&&<MenuButton title="اثر انگشت" onPress={biometric}/>}</View><MenuButton title="بازگشت" onPress={onBack}/></View>;
}

function SignalFlash({ kind }) { const opacity=useRef(new Animated.Value(0)).current; const scale=useRef(new Animated.Value(0.65)).current; useEffect(()=>{Animated.parallel([Animated.sequence([Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}),Animated.timing(opacity,{toValue:0,duration:2200,useNativeDriver:true})]),Animated.spring(scale,{toValue:1,friction:5,useNativeDriver:true})]).start();},[opacity,scale]); return <Animated.View pointerEvents="none" style={[styles.signalFlash,{opacity,transform:[{scale}]}]}><View style={styles.signalOrbit}><Text style={styles.signalGlyph}>{kind==='online'?'⌁':'✦'}</Text></View><Text style={styles.signalText}>{kind==='online'?'نوا آنلاین شد':'پیام رسید؛ منتظر پاسخ'}</Text></Animated.View>; }

function BluetoothPage({ settings, onBack, pulseSignal, speakerPowered, toggleSpeakerPower, update }) {
  const [connected,setConnected]=useState(false);
  const orbit=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if (connected) { orbit.stopAnimation(); return; }
    orbit.setValue(0);
    const loop=Animated.loop(Animated.timing(orbit,{toValue:1,duration:6200,useNativeDriver:true}));
    loop.start();
    return()=>loop.stop();
  },[connected,orbit]);
  const rotate=orbit.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const toggle=()=>setConnected(v=>{const n=!v; speakStatus(settings,n?'bluetooth':'bluetoothExit'); pulseSignal(n?'online':'delivered'); return n;});
  const wifiConnected=!!settings.wifiConnected;
  const toggleWifi=async()=>{
    if (wifiConnected) { update({wifiConnected:false}); pulseSignal('delivered'); return; }
    const ok=await checkWifiConnection(settings);
    update({wifiConnected:ok});
    pulseSignal(ok?'online':'delivered');
    if(!ok) Alert.alert('پیوند وای‌فای','اسپیکر در نشانی ثبت‌شده پاسخ نداد. اگر وای‌فای محلی است، ابتدا گوشی را به شبکه/هات‌اسپات نوا وصل کن.');
  };
  const hero=settings.logoUri?{uri:settings.logoUri}:KOROSH_NOVA_LOGO;
  return <PageShell pageKey="bluetooth" title="بلوتوث نوا" settings={settings}>
    <View style={styles.btBrand}>
      <View style={styles.btHeroFrame}>
        <View style={styles.btHeroOrbitA}/><View style={styles.btHeroOrbitB}/><View style={styles.btHeroSparkTop}/><View style={styles.btHeroSparkBottom}/>
        <Image source={hero} style={styles.btHeroImageLarge}/>
      </View>
    </View>
    <View style={styles.btCore}>
      <View style={[styles.btRing,connected&&styles.btConnected]}>
        <Animated.View style={[styles.btAnimRingA,{transform:[{rotate}],opacity:connected?1:0.38}]}/><Animated.View style={[styles.btAnimRingB,{transform:[{rotate}],opacity:connected?1:0.32}]}/>
        <Animated.View style={[styles.btGlyphOrbit,{transform:[{rotateY:rotate}]}]}><Text style={styles.btGlyph}>⌁</Text></Animated.View>
      </View>
      <Text style={styles.btState}>{connected?'بلوتوث متصل':'بلوتوث قطع'}</Text>
    </View>
    <View style={styles.btConnectionModes}>
      <CosmicControlButton icon="⌁" label={settings.transportMode==='bluetooth'?'مسیر بلوتوث فعال':'بلوتوث'} active={settings.transportMode==='bluetooth'} onPress={()=>update({transportMode:'bluetooth',lightTransportMode:'bluetooth'})}/>
      <CosmicControlButton icon="⌬" label={settings.transportMode==='wifi'?'مسیر وای‌فای فعال':'وای‌فای'} active={settings.transportMode==='wifi'} onPress={()=>update({transportMode:'wifi',lightTransportMode:'wifi'})}/>
    </View>
    <View style={styles.btWirelessMini}>
      <Pressable onPress={toggleWifi} style={styles.wifiMiniPress} accessibilityRole="button" accessibilityLabel="اتصال وای‌فای نوا">
        <View style={[styles.wifiMiniOrb,{borderColor:wifiConnected?'#75ffc8':'#79e8ff',shadowColor:wifiConnected?'#75ffc8':'#79e8ff'}]}>
          <View style={[styles.wifiMiniOrbit,{borderColor:wifiConnected?'#75ffc8':'#b28cff'}]}/>
          <Text style={styles.wifiMiniGlyph}>⌁</Text>
          <Text style={[styles.wifiMiniState,{color:wifiConnected?'#75ffc8':'#79e8ff'}]}>{wifiConnected?'وای‌فای متصل':'وای‌فای قطع'}</Text>
        </View>
      </Pressable>
      <Text style={styles.wifiMiniHint}>برای اتصال، مسیر وای‌فای را انتخاب کن</Text>
    </View>
    <View style={styles.btPowerZone}>
      <CosmicPowerButton powered={speakerPowered} onPress={toggleSpeakerPower} />
    </View>
    <MenuButton title={connected?'قطع ارتباط بلوتوث':'جست‌وجوی نوا با بلوتوث'} onPress={toggle} />
  </PageShell>; }

function WifiPortalCard({ settings, update }) {
  const connected=!!settings.wifiConnected;
  const [checking,setChecking]=useState(false);
  const toggle=async()=>{
    if(connected){ update({wifiConnected:false}); return; }
    setChecking(true);
    const ok=await checkWifiConnection(settings);
    setChecking(false);
    update({wifiConnected:ok});
    if(!ok) Alert.alert('پیوند وای‌فای','اسپیکر در نشانی ثبت‌شده پاسخ نداد.');
  };
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>درگاه وای‌فای نوا</Text>
    <View style={styles.wifiPortalRow}>
      <Pressable onPress={toggle} style={styles.wifiPortalPress}>
        <View style={[styles.wifiPortalOrb,{borderColor:connected?'#75ffc8':'#79e8ff',shadowColor:connected?'#75ffc8':'#79e8ff'}]}>
          <View style={[styles.wifiPortalOrbit,{borderColor:connected?'#75ffc8':'#b28cff'}]}/>
          <Text style={styles.wifiPortalGlyph}>⌬</Text>
          <Text style={[styles.wifiPortalState,{color:connected?'#75ffc8':'#79e8ff'}]}>{checking?'در حال بررسی…':connected?'متصل':'قطع'}</Text>
        </View>
      </Pressable>
      <View style={styles.wifiPortalText}><Text style={styles.wifiPortalTitle}>{settings.wifiMode==='internet'?'وای‌فای اینترنتی':'وای‌فای محلی'}</Text><Text style={styles.smallHint}>کنترل اسپیکر از شبکه محلی می‌تواند بدون اینترنت انجام شود.</Text></View>
    </View>
  </View>;
}

function hsvToHex(h,s,v=1) {
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;} else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
  return '#'+[r,g,b].map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
function colorFromTouch(e, size=190) {
  const c=size/2, x=e.nativeEvent.locationX-c, y=e.nativeEvent.locationY-c;
  const d=Math.min(c-8, Math.hypot(x,y));
  const h=(Math.atan2(y,x)*180/Math.PI+360)%360;
  return { color: hsvToHex(h, Math.min(1,d/(c-8)), 1), x:c+(x/(Math.hypot(x,y)||1))*d, y:c+(y/(Math.hypot(x,y)||1))*d };
}

function RgbColorPortal({ color, onChange }) {
  const SIZE=190, [point,setPoint]=useState({x:95,y:95});
  const spin=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.timing(spin,{toValue:1,duration:10500,useNativeDriver:true}));loop.start();return()=>loop.stop();},[spin]);
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:e=>{const p=colorFromTouch(e,SIZE);setPoint(p);onChange(p.color)},onPanResponderMove:e=>{const p=colorFromTouch(e,SIZE);setPoint(p);onChange(p.color)}}),[onChange]);
  const rotate=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const swatches=['#ff3fd1','#5ef2ff','#a8ff3e','#ffd45f','#8b78ff','#ff6b72','#54ffb1','#ffffff'];
  return <View {...responder.panHandlers} style={[styles.rgbPortal,{borderColor:color,shadowColor:color}]}>
    <Animated.View pointerEvents="none" style={[styles.rgbPortalRing,{transform:[{rotate}]}]}>
      {swatches.map((c,i)=><View key={c} style={[styles.rgbPortalSegment,{backgroundColor:c,transform:[{rotate:`${i*45}deg`},{translateY:-77}]}]}/>) }
    </Animated.View>
    <View pointerEvents="none" style={styles.rgbPortalInner}><View style={[styles.rgbPortalCore,{backgroundColor:color,shadowColor:color}]}/><Text style={styles.rgbPortalHex}>{String(color).toUpperCase()}</Text><Text style={styles.rgbPortalText}>لمس و کشیدن</Text></View>
    <View pointerEvents="none" style={[styles.rgbPortalMarker,{left:point.x-9,top:point.y-9,borderColor:color}]} />
  </View>;
}

function GalaxyColorPortal({ color, onChange, size=190 }) {
  const SIZE=size, [point,setPoint]=useState({x:95,y:95});
  const orbit=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.timing(orbit,{toValue:1,duration:15000,useNativeDriver:true}));loop.start();return()=>loop.stop();},[orbit]);
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:e=>{const p=colorFromTouch(e,SIZE);setPoint(p);onChange(p.color)},onPanResponderMove:e=>{const p=colorFromTouch(e,SIZE);setPoint(p);onChange(p.color)}}),[onChange]);
  const rotate=orbit.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const stars=['#d7c7ff','#61e9ff','#ff8ad5','#9dffde','#fff0a6','#b995ff'];
  return <View {...responder.panHandlers} style={[styles.galaxyPortal,{borderColor:color,shadowColor:color}]}>
    <Animated.View pointerEvents="none" style={[styles.galaxyPortalOrbit,{transform:[{rotate}]}]}/><Animated.View pointerEvents="none" style={[styles.galaxyPortalOrbit2,{transform:[{rotate:orbit.interpolate({inputRange:[0,1],outputRange:['360deg','0deg']})}]}]}/ >
    {stars.map((c,i)=><View key={c} pointerEvents="none" style={[styles.galaxyStar,{backgroundColor:c,left:24+(i*29)%132,top:26+(i*47)%132}]}/>) }
    <View pointerEvents="none" style={styles.galaxyPortalInner}><View style={[styles.galaxyPortalCore,{backgroundColor:color,shadowColor:color}]}/><Text style={styles.galaxyPortalHex}>{String(color).toUpperCase()}</Text><Text style={styles.galaxyPortalText}>لمس برای انتخاب ستاره</Text></View>
    <View pointerEvents="none" style={[styles.galaxyPortalMarker,{left:point.x-8,top:point.y-8,borderColor:color}]}/>
  </View>;
}

function GalaxyPage({ settings, update, onBack }) {
  const [tab,setTab]=useState(0);
  const cfg=settings.lightSettings?.galaxy||DEFAULT_SETTINGS.lightSettings.galaxy;
  const patch=p=>{
    const next={...cfg,...p};
    update({lightSettings:{...(settings.lightSettings||DEFAULT_SETTINGS.lightSettings),galaxy:next}});
    try { sendLightCommand(settings,{mode:'galaxy',settings:next,transport:settings.lightTransportMode||'auto'}); } catch (_) {}
  };
  const tabs=[['✦','رنگ کهکشانی'],['☄','۳۰ افکت'],['◌','گردون بالا/پایین']];
  const effects=['✦','☄','✺','✧','◌','⊹','✹','⌁','◈','✷','⋆','⟡','☼','✸','◒','⊙','✺','✹','☄','✦','◈','✷','⋆','⟡','☼','✸','◒','⊙','⌁','✺'];
  const effectNames=['ستاره','شهاب','انفجار نور','جرقه','مه کیهانی','نبض ستاره','شفق','موج فضا','کریستال','پالس','ستاره‌باران','هاله','خورشید','شعله نور','ماه','مدار','سوپرنوا','کهکشان باز','دنباله‌دار','ستاره‌زنده','الماس نور','برق فضایی','بی‌نهایت','شکاف نور','مرکز کهکشان','بارش ستاره','چشم کیهانی','شبکه ستاره','موج کهکشانی','ستاره‌باران پیاپی'];
  return <PageShell pageKey="galaxy" title="کهکشان نوا" settings={settings}>
    <View style={styles.galaxyTabs}>{tabs.map(([g,l],i)=><CosmicTabButton key={l} glyph={g} label={l} index={i} active={tab===i} onPress={()=>setTab(i)} />)}</View>
    <View style={styles.galaxyHero}><View style={[styles.galaxyHeroOrb,{borderColor:cfg.color,shadowColor:cfg.color}]}><View style={styles.galaxyHeroOrbit}/><Text style={styles.galaxyHeroGlyph}>✧</Text><Text style={styles.galaxyHeroLabel}>GALAXY</Text></View></View>
    {tab===0&&<View style={styles.galaxyCard}><Text style={styles.cardTitle}>رنگ کهکشانی</Text><GalaxyColorPortal size={176} color={cfg.color} onChange={color=>patch({color})}/><View style={styles.colorDots}>{['#7f8cff','#ff67d5','#5ef2ff','#ffd66b','#78ffad','#b18cff'].map((c,i)=><CosmicColorChip key={c} color={c} index={i} active={c===cfg.color} onPress={()=>patch({color:c})}/>)}</View><View style={styles.galaxySliderBox}><Text style={styles.sliderLabel}>شدت نور {Math.round(cfg.brightness)}٪</Text><SliderLike value={cfg.brightness} onChange={v=>patch({brightness:v})}/><Text style={styles.sliderLabel}>سرعت نور {Math.round(cfg.speed)}٪</Text><SliderLike value={cfg.speed} onChange={v=>patch({speed:v})}/></View></View>}
    {tab===1&&<View style={styles.galaxyCard}><Text style={styles.cardTitle}>۳۰ افکت کهکشانی</Text><View style={styles.galaxyEffectGrid}>{effects.map((g,i)=><CosmicEffectTile compact key={`galaxy-effect-${i}`} glyph={g} name={effectNames[i]} index={i+1} active={cfg.effect===i} toneIndex={i} onPress={()=>patch({effect:i})}/>)}</View></View>}
    {tab===2&&<View style={styles.galaxyCard}><Text style={styles.cardTitle}>گردون‌های بالا و پایین</Text><View style={styles.galaxyWheelRow}><CosmicControlButton icon="↑" label="گردون بالا" active={!!cfg.wheelTop} onPress={()=>patch({wheelTop:!cfg.wheelTop})}/><CosmicControlButton icon="↓" label="گردون پایین" active={!!cfg.wheelBottom} onPress={()=>patch({wheelBottom:!cfg.wheelBottom})}/></View><View style={styles.wheelStatusRow}><Text style={styles.wheelStatus}>{cfg.wheelTop?'گردون بالا روشن':'گردون بالا خاموش'}</Text><Text style={styles.wheelStatus}>{cfg.wheelBottom?'گردون پایین روشن':'گردون پایین خاموش'}</Text></View></View>}
    <WifiPortalCard settings={settings} update={update}/>
  </PageShell>;
}

function LightingLabPage({ mode, settings, update, onBack }) {
  const [tab,setTab]=useState(0);
  const cfg=settings.lightSettings?.[mode]||DEFAULT_SETTINGS.lightSettings[mode];
  const patch=p=>{ const next={...cfg,...p}; update({lightSettings:{...(settings.lightSettings||DEFAULT_SETTINGS.lightSettings),[mode]:next}}); sendLightCommand(settings,{mode,settings:next,transport:settings.lightTransportMode||'auto'}); };
  const tabs=mode==='rgb'?[['◈','چهارسیمه'],['◉','رنگ دلخواه'],['✧','نئون']]:[['✦','رنگ کهکشانی'],['☄','۳۰ افکت'],['◌','گردون بالا/پایین']];
  const effects=['✦','☄','✺','✧','◌','⊹','✹','⌁','◈','✷','⋆','⟡','☼','✸','◒','⊙','✺','✹','☄','✦','◈','✷','⋆','⟡','☼','✸','◒','⊙','⌁','✺'];
  const effectNames=['ستاره','شهاب','انفجار نور','جرقه','مه کیهانی','نبض ستاره','شفق','موج فضا','کریستال','پالس','ستاره‌باران','هاله','خورشید','شعله نور','ماه','مدار','سوپرنوا','کهکشان باز','دنباله‌دار','ستاره‌زنده','الماس نور','برق فضایی','بی‌نهایت','شکاف نور','مرکز کهکشان','بارش ستاره','چشم کیهانی','شبکه ستاره','موج کهکشانی','ستاره‌باران پیاپی'];
  const neonEffects=['موج رنگی','دنباله نور','نبض رنگ','شفق دور اسپیکر','تعقیب نور','رعد نئون','باران رنگ','ستاره‌های نئون','مارپیچ رنگ','آتش کیهانی','تنفس نور','دویدن نور','پالس دایره‌ای','موج دوطرفه','جرقه‌های متوالی','رنگین‌کمان روان','فلش فضایی','شهاب نئون','هاله زنده','جشن نئون'];
  const neonGlyphs=['≋','☄','◉','✦','➜','⚡','⋮','✧','◌','✺','◒','»','◎','↔','✹','🌈','➤','☄','◍','✦'];
  const colorPage=(mode==='rgb'&&tab===1)||(mode==='galaxy'&&tab===0);
  return <PageShell pageKey={mode} title={mode==='rgb'?'هاله نور':'کهکشان نوا'} onBack={onBack} settings={settings}>
    <View style={styles.cosmicTabs}>{tabs.map(([g,l],i)=><CosmicTabButton key={l} glyph={g} label={l} index={i} active={tab===i} onPress={()=>setTab(i)} />)}</View>
    <View style={styles.lightCore}><View style={[styles.lightOrb,{borderColor:cfg.color,shadowColor:cfg.color}]}><View style={styles.lightOrbOrbit}/><Text style={styles.lightOrbGlyph}>{mode==='galaxy'?'✧':'◉'}</Text><Text style={styles.lightOrbLabel}>{mode==='galaxy'?'GALAXY':'RGB'}</Text></View></View>
    {colorPage&&<View style={styles.card}><Text style={styles.cardTitle}>{mode==='galaxy'?'رنگ کهکشانی':'رنگ دلخواه RGB'}</Text>{mode==='rgb'?<RgbColorPortal color={cfg.color} onChange={color=>patch({color})}/>:<GalaxyColorPortal color={cfg.color} onChange={color=>patch({color})}/>}<View style={styles.colorDots}>{['#7f8cff','#ff67d5','#5ef2ff','#ffd66b','#78ffad','#b18cff'].map((c,i)=><CosmicColorChip key={c} color={c} index={i} active={c===cfg.color} onPress={()=>patch({color:c})} />)}</View><View style={styles.cardInner}><Text style={styles.sliderLabel}>شدت نور {Math.round(cfg.brightness)}٪</Text><SliderLike value={cfg.brightness} onChange={v=>patch({brightness:v})}/><Text style={styles.sliderLabel}>سرعت نور {Math.round(cfg.speed)}٪</Text><SliderLike value={cfg.speed} onChange={v=>patch({speed:v})}/></View></View>}
    {mode==='galaxy'&&tab===1&&<View style={styles.card}><Text style={styles.cardTitle}>۳۰ افکت کهکشانی</Text><View style={styles.effectGrid}>{effects.map((g,i)=><CosmicEffectTile key={i} glyph={g} name={effectNames[i]} index={i+1} active={cfg.effect===i} toneIndex={i} onPress={()=>patch({effect:i})} />)}</View></View>}
    {mode==='rgb'&&tab===2&&<View style={styles.card}><Text style={styles.cardTitle}>۲۰ افکت نئون دور اسپیکر</Text><View style={styles.effectGrid}>{neonEffects.map((name,i)=><CosmicEffectTile key={i} glyph={neonGlyphs[i]} name={name} index={i+1} active={cfg.neonEffect===i} toneIndex={i+2} onPress={()=>patch({neonEffect:i})} />)}</View></View>}
    {mode==='galaxy'&&<WifiPortalCard settings={settings} update={update}/>}
    {mode==='galaxy'&&tab===2&&<View style={styles.card}><Text style={styles.cardTitle}>گردون‌های بالا و پایین</Text><View style={styles.wheelControlRow}><CosmicControlButton icon="↑" label="روشن و خاموش کردن گردون بالا" active={!!cfg.wheelTop} onPress={()=>patch({wheelTop:!cfg.wheelTop})}/><CosmicControlButton icon="↓" label="روشن و خاموش کردن گردون پایین" active={!!cfg.wheelBottom} onPress={()=>patch({wheelBottom:!cfg.wheelBottom})}/></View><View style={styles.wheelStatusRow}><Text style={styles.wheelStatus}>{cfg.wheelTop?'گردون بالا روشن':'گردون بالا خاموش'}</Text><Text style={styles.wheelStatus}>{cfg.wheelBottom?'گردون پایین روشن':'گردون پایین خاموش'}</Text></View></View>}
    {mode==='rgb'&&tab===0&&<View style={styles.card}><Text style={styles.cardTitle}>RGB چهار سیمه</Text><View style={styles.choiceRow}><CosmicControlButton icon="⏻" label="روشن" active={cfg.enabled===true} onPress={()=>patch({enabled:true})}/><CosmicControlButton icon="◌" label="خاموش" active={cfg.enabled===false} onPress={()=>patch({enabled:false})}/></View><View style={styles.cardInner}><Text style={styles.sliderLabel}>شدت نور {Math.round(cfg.brightness)}٪</Text><SliderLike value={cfg.brightness} onChange={v=>patch({brightness:v})}/><Text style={styles.sliderLabel}>سرعت تغییر نور {Math.round(cfg.speed)}٪</Text><SliderLike value={cfg.speed} onChange={v=>patch({speed:v})}/></View></View>}
    {mode==='rgb'&&tab===2&&<View style={styles.card}><Text style={styles.cardTitle}>کنترل نئون برنامه‌پذیر دور اسپیکر</Text><View style={styles.choiceRow}><CosmicControlButton icon="⏻" label="روشن" active={cfg.enabled===true} onPress={()=>patch({enabled:true})}/><CosmicControlButton icon="◌" label="خاموش" active={cfg.enabled===false} onPress={()=>patch({enabled:false})}/><CosmicControlButton icon="♫" label="هماهنگ با موسیقی" active={!!cfg.dance} onPress={()=>patch({dance:!cfg.dance})}/></View><View style={styles.cardInner}><Text style={styles.sliderLabel}>شدت نئون {Math.round(cfg.brightness)}٪</Text><SliderLike value={cfg.brightness} onChange={v=>patch({brightness:v})}/><Text style={styles.sliderLabel}>سرعت افکت {Math.round(cfg.speed)}٪</Text><SliderLike value={cfg.speed} onChange={v=>patch({speed:v})}/></View></View>}
  </PageShell>;
}

function SettingsPage({ onBack, settings, update, open, changeGlobalSecurityPin }) {
  const [globalPinCurrent, setGlobalPinCurrent] = useState('');
  const [globalPinDraft, setGlobalPinDraft] = useState('');
  const pickImage = async (key, label) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('دسترسی لازم است', `برای انتخاب ${label} اجازه Gallery را فعال کن.`); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
    if (!result.canceled) {
      if (key === 'logoUri' && settings.logoLocked) return;
      const uri = await persistLocalFile(result.assets[0].uri, `${key}.img`);
      if (key === 'logoUri') update({ logoUri: uri, logoLocked: true });
      else { update({ [key]: uri, ...(key === 'musicImageUri' ? { musicImageMode: 'gallery' } : {}) }); }
    }
  };


  const pickNavIcon = async (key) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!result.canceled) update({ buttonIcons: { ...(settings.buttonIcons || {}), [key]: await persistLocalFile(result.assets[0].uri, `nav_${key}`) } });
  };
  const pickBackground = async (key) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
    if (!result.canceled) update({ pageBackgrounds: { ...(settings.pageBackgrounds || {}), [key]: await persistLocalFile(result.assets[0].uri, `background_${key}`) } });
  };
  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: true });
    if (!result.canceled) { const list=[]; for (const x of result.assets || []) list.push({ uri: await persistLocalFile(x.uri, x.name || 'song'), name: x.name || 'آهنگ' }); update({ musicPlaylist:list, musicUri:list[0]?.uri||null, musicName:list[0]?.name||null }); }
  };
  const setModule = (key, value) => update({ hardwareModules: { ...(settings.hardwareModules || {}), [key]: value } });
  const previewPower = async (which) => { await speakPower(settings, which === 'on'); };
  const setPowerMode = (side, mode) => update({ powerSoundMode: { ...(settings.powerSoundMode || {}), [side]: mode }, powerSoundEnabled: { ...(settings.powerSoundEnabled || {}), [side]: mode !== 'off' } });
  const cyclePowerPreset = (side) => { const key = side === 'on' ? 'powerOnPreset' : 'powerOffPreset'; const next = ((Number(settings[key]) || 0) + 1) % 5; update({ [key]: next, powerSoundMode: { ...(settings.powerSoundMode || {}), [side]: 'preset' }, powerSoundEnabled: { ...(settings.powerSoundEnabled || {}), [side]: true } }); };

  return (
    <PageShell pageKey="control" title="اتاق فرمان" settings={settings}>
      

      <View style={styles.card}>
        <Text style={styles.cardTitle}>هویت ثابت اسپیکر هوشمند نوا</Text>
        <View style={styles.logoSettingPreview}>
          <Image source={KOROSH_NOVA_LOGO} style={styles.logoSettingImage}/>
        </View>
        <View style={styles.logoLockBadge}>
          <Text style={styles.logoLockGlyph}>◇</Text>
          <Text style={styles.smallHint}>لوگوی داخل برنامه و آیکون خود برنامه همین تصویر ثابت هستند و در نسخه‌های توزیع‌شده تغییر نمی‌کنند.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>آیکون‌های نوار پایین</Text>
        
        {NAV_ITEMS.map(([key,label]) => (
          <View key={key} style={styles.settingTile}>
            <Text style={styles.settingTileTitle}>{label}</Text>
            <View style={styles.choiceRow}>
              <MenuButton title="بازگشت به پیش‌فرض" compact onPress={() => update({ buttonIconPreset:{...(settings.buttonIconPreset||{}),[key]:0}, buttonIcons:{...(settings.buttonIcons||{}),[key]:null} })} iconUri={NAV_PRESETS[key][0]} />
              <MenuButton title="گالری" compact onPress={() => pickNavIcon(key)} iconUri={settings.buttonIcons?.[key]} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetStrip}>{NAV_PRESETS[key].map((src,i)=><Pressable key={i} onPress={()=>update({buttonIconPreset:{...(settings.buttonIconPreset||{}),[key]:i},buttonIcons:{...(settings.buttonIcons||{}),[key]:null}})}><View style={[styles.presetThumb, Number(settings.buttonIconPreset?.[key])===i&&styles.presetThumbActive]}><Image source={src} style={styles.presetImage}/></View></Pressable>)}</ScrollView>
            
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>پس‌زمینه‌ی هفت صفحه</Text>
        
        {NAV_ITEMS.map(([key,label]) => (
          <View key={key} style={styles.settingTile}>
            <Text style={styles.settingTileTitle}>{label}</Text>
            <View style={styles.choiceRow}>
              <MenuButton title="پیش‌فرض‌ها (۵ حالت)" compact onPress={() => update({ pageBackgroundPreset:{...(settings.pageBackgroundPreset||{}),[key]:((Number(settings.pageBackgroundPreset?.[key])||0)+1)%5}, pageBackgrounds:{...(settings.pageBackgrounds||{}),[key]:null} })} />
              <MenuButton title="گالری" compact onPress={() => pickBackground(key)} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetStrip}>{BACKGROUND_PRESETS[key].map((src,i)=><Pressable key={i} onPress={()=>update({pageBackgroundPreset:{...(settings.pageBackgroundPreset||{}),[key]:i},pageBackgrounds:{...(settings.pageBackgrounds||{}),[key]:null}})}><View style={[styles.presetThumb, Number(settings.pageBackgroundPreset?.[key])===i&&!settings.pageBackgrounds?.[key]&&styles.presetThumbActive]}><Image source={src} style={styles.presetImage}/></View></Pressable>)}</ScrollView>
            <Text style={styles.smallHint}>۵ پس‌زمینهٔ کاملاً متفاوت؛ یا یک تصویر از گالری.</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}><Text style={styles.cardTitle}>هسته‌ی تصویری بلوتوث</Text><View style={styles.choiceRow}>{NAV_PRESETS.bluetooth.map((src,i)=><MenuButton key={i} title={`هسته ${i+1}`} compact iconUri={src} onPress={()=>update({bluetoothHeroPreset:i,bluetoothHeroUri:null})}/>)}</View><MenuButton title="انتخاب هسته از گالری" onPress={()=>pickImage('bluetoothHeroUri','هسته بلوتوث')}/></View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>تصویر آوای نوا</Text>
        <View style={styles.choiceRow}>
          <MenuButton title={settings.musicImageMode==='preset'?'✓ پیش‌فرض':'پیش‌فرض'} compact onPress={()=>update({musicImageMode:'preset',musicImageUri:null})} />
          <MenuButton title={settings.musicImageMode==='gallery'?'✓ گالری':'انتخاب از گالری'} compact onPress={()=>pickImage('musicImageUri','تصویر آوای نوا')} />
          <MenuButton title={settings.musicImageMode==='effect'?'✓ افکت':'افکت'} compact onPress={()=>update({musicImageMode:'effect'})} />
        </View>
        {settings.musicImageMode==='preset' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetStrip}>{MUSIC_PRESETS.map((src,i)=><Pressable key={i} onPress={()=>update({musicImagePreset:i,musicImageUri:null,musicImageMode:'preset'})}><View style={[styles.presetThumb,Number(settings.musicImagePreset)===i&&styles.presetThumbActive]}><Image source={src} style={styles.presetImage}/></View></Pressable>)}</ScrollView>}
        {settings.musicImageMode==='gallery' && <MenuButton title={settings.musicImageUri?'✓ تصویر گالری انتخاب شده':'🖼️ انتخاب تصویر از گالری'} onPress={()=>pickImage('musicImageUri','تصویر آوای نوا')} />}
        {settings.musicImageMode==='effect' && <View style={styles.choiceRow}>{MUSIC_EFFECTS.map((k,i)=><MenuButton key={k} title={settings.musicVisualEffect===k?'✓ '+MUSIC_EFFECT_NAMES[i]:MUSIC_EFFECT_NAMES[i]} compact onPress={()=>update({musicVisualEffect:k,musicImageMode:'effect'})}/>)}</View>}
        <MusicArtwork source={settings.musicImageUri ? {uri:settings.musicImageUri} : MUSIC_PRESETS[Math.max(0,Math.min(2,Number(settings.musicImagePreset)||0))]} playing effect={settings.musicVisualEffect || 'rotate'} size={130} />
        <Text style={styles.smallHint}>سه حالت مستقل: پیش‌فرض‌های فضایی، تصویر گالری، یا افکت زنده. چرخش تصویر آرام است و یک دور حدود ۱۲ ثانیه طول می‌کشد.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>حال‌وهوای رابط نوا</Text>
        
        <View style={styles.choiceRow}>{[[0,'کیهانی متعادل'],[1,'کهربایی لوکس'],[2,'یخی آینده‌نگر']].map(([k,l])=><MenuButton key={k} title={settings.uiThemePreset===k?'✓ '+l:l} compact onPress={()=>update({uiThemePreset:k})}/>)}</View>
      </View>

      <View style={styles.card}><Text style={styles.cardTitle}>شخصیت زهره</Text><View style={styles.choiceRow}>{[['friendly','♡ صمیمی'],['smart','✦ باهوش'],['calm','≈ آرام']].map(([k,l])=><MenuButton key={k} title={settings.aiPersonality===k?'✓ '+l:l} compact onPress={()=>update({aiPersonality:k})}/>)}</View><View style={styles.choiceRow}>{[['playful','◌ شوخ'],['serious','◇ رسمی']].map(([k,l])=><MenuButton key={k} title={settings.aiPersonality===k?'✓ '+l:l} compact onPress={()=>update({aiPersonality:k})}/>)}</View></View>

      <View style={styles.card}><Text style={styles.cardTitle}>مسیر هوش زهره</Text><View style={styles.choiceRow}>{[['online','آنلاین'],['offline','آفلاین']].map(([k,l])=><MenuButton key={k} title={settings.aiMode===k?'✓ '+l:l} compact onPress={()=>update({aiMode:k})}/>)}</View><View style={styles.choiceRow}>{[['wifi','وای‌فای'],['cellular','سیم‌کارت']].map(([k,l])=><MenuButton key={k} title={settings.aiConnection===k?'✓ '+l:l} compact onPress={()=>update({aiConnection:k})}/>)}</View></View>

      <View style={styles.card}><Text style={styles.cardTitle}>هسته قابل ارتقای زهره</Text><View style={styles.choiceRow}>{[['groq','هسته سریع'],['openai','هسته دوم'],['custom','هسته آینده']].map(([k,l])=><MenuButton key={k} title={settings.aiUpgrade?.provider===k?'✓ '+l:l} compact onPress={()=>update({aiUpgrade:{...(settings.aiUpgrade||{}),provider:k}})}/>)}</View><TextInput value={settings.aiUpgrade?.model||''} onChangeText={v=>update({aiUpgrade:{...(settings.aiUpgrade||{}),model:v}})} placeholder="نام هسته" placeholderTextColor="#77809a" style={styles.searchInput}/><MenuButton title={settings.aiUpgrade?.memory===false?'حافظه زهره خاموش':'حافظه زهره روشن'} compact onPress={()=>update({aiUpgrade:{...(settings.aiUpgrade||{}),memory:settings.aiUpgrade?.memory===false}})}/></View>

      <View style={styles.card}><Text style={styles.cardTitle}>امنیت موقتاً غیرفعال است</Text><Text style={styles.smallHint}>برای این مرحله، رمزگذاری، قفل صفحه‌ها و بیومتریک فعال نیستند تا همهٔ بخش‌های نوا را بدون مانع بررسی کنیم.</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>صداهای هویتی نوا</Text>{[['powerOn','روشن‌شدن'],['powerOff','خاموش‌شدن'],['bluetooth','ورود بلوتوث'],['bluetoothExit','خروج بلوتوث'],['usb','ورود USB'],['usbExit','خروج USB'],['online','آنلاین‌شدن'],['delivered','تحویل پیام']].map(([key,label])=>{const list=STATUS_PHRASES[key];const preset=key==='powerOn'?settings.powerOnPreset:key==='powerOff'?settings.powerOffPreset:(settings.statusSoundPresets?.[key]||0);const next=()=>key==='powerOn'?update({powerOnPreset:(preset+1)%list.length}):key==='powerOff'?update({powerOffPreset:(preset+1)%list.length}):update({statusSoundPresets:{...(settings.statusSoundPresets||{}),[key]:(preset+1)%list.length}});const preview=async()=>{speakWithFemale(list[preset]);};return <View key={key} style={styles.identityTile}><Text style={styles.identityLabel}>{label}</Text><Text style={styles.identityPhrase}>{list[preset]}</Text><View style={styles.choiceRow}><MenuButton title="آوای بعدی" compact onPress={next}/><MenuButton title="شنیدن" compact onPress={preview}/><MenuButton title={settings.statusSoundEnabled?.[key]===false?'بیدار کردن آوا':'خاموش کردن آوا'} compact onPress={()=>update({statusSoundEnabled:{...(settings.statusSoundEnabled||{}),[key]:settings.statusSoundEnabled?.[key]===false}})}/></View></View>})}</View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>آوای روشن و خاموش اسپیکر</Text>
        <Text style={styles.smallHint}>برای هرکدام سه حالت دارد: خاموش، آوای نوا، یا فایل انتخابی از گوشی. آواهای پیش‌فرض با صدای زن پخش می‌شوند.</Text>
        {[['on','روشن‌شدن','powerOnPreset'],['off','خاموش‌شدن','powerOffPreset']].map(([side,label,key])=>{
          const mode=settings.powerSoundMode?.[side]||'preset';
          const preset=Number(settings[key])||0;
          const phrase=STATUS_PHRASES[side==='on'?'powerOn':'powerOff'][preset];
          return <View key={side} style={styles.identityTile}>
            <Text style={styles.identityLabel}>{label}</Text>
            <Text style={styles.identityPhrase}>{mode==='off'?'آوا خاموش':mode==='custom'?(side==='on'?(settings.powerOnSound?.name||'فایل گوشی'):(settings.powerOffSound?.name||'فایل گوشی')):phrase}</Text>
            <View style={styles.choiceRow}>
              <MenuButton title={mode==='off'?'✓ خاموش':'خاموش'} compact onPress={()=>setPowerMode(side,'off')}/>
              <MenuButton title={mode==='preset'?'✓ پیش‌فرض':'پیش‌فرض'} compact onPress={()=>setPowerMode(side,'preset')}/>
              <MenuButton title={mode==='custom'?'✓ گوشی':'از گوشی'} compact onPress={()=>setPowerMode(side,'custom')}/>
            </View>
            <View style={styles.choiceRow}>
              <MenuButton title={`آوای ${preset+1} از ۵`} compact onPress={()=>cyclePowerPreset(side)}/>
              <MenuButton title="شنیدن" compact onPress={()=>previewPower(side)}/>
            </View>
            <MenuButton title={`انتخاب فایل ${side==='on'?'روشن‌شدن':'خاموش‌شدن'} از گوشی`} compact onPress={async()=>{const r=await DocumentPicker.getDocumentAsync({type:'audio/*',copyToCacheDirectory:true});if(!r.canceled){const file={uri:await persistLocalFile(r.assets[0].uri,side==='on'?'power_on':'power_off'),name:r.assets[0].name||'آوای شخصی'};update(side==='on'?{powerOnSound:file,powerSoundMode:{...(settings.powerSoundMode||{}),on:'custom'},powerSoundEnabled:{...(settings.powerSoundEnabled||{}),on:true}}:{powerOffSound:file,powerSoundMode:{...(settings.powerSoundMode||{}),off:'custom'},powerSoundEnabled:{...(settings.powerSoundEnabled||{}),off:true}});}}}/>
          </View>;
        })}
      </View>

      <View style={styles.card}><Text style={styles.cardTitle}>اتاق آینده</Text><View style={styles.choiceRow}><CosmicControlButton icon="≋" label="اکولایزر آوا" onPress={()=>open('equalizer')} large/><CosmicControlButton icon="◉" label="چشم نوا" onPress={()=>open('camera')} large/><CosmicControlButton icon="✦" label="حسگرها" onPress={()=>open('sensors')} large/></View></View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>چشمِ آینده و گنجینهٔ تصویر</Text>
        <Text style={styles.smallHint}>این بخش برای دوربین باکیفیت آینده رزرو شده؛ ۴K به‌عنوان گزینهٔ آماده ثبت شده و در زمان اتصال دوربین واقعی فقط در صورت پشتیبانی سخت‌افزار فعال می‌شود. ضبط مجالس، ذخیره‌سازی جدا و دوربین اضطراری ۱۵ دقیقه‌ای هم از همین مسیر کنترل می‌شوند.</Text>
        <View style={styles.choiceRow}>{[['1080p','فول‌اچ‌دی'],['4k','۴K'],['720p','اچ‌دی']].map(([k,l])=><MenuButton key={k} title={settings.futureCamera?.quality===k?'✓ '+l:l} compact onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),quality:k}})}/>)}</View>
        <View style={styles.choiceRow}>{[['sd','کارت حافظه'],['usb','USB اختصاصی ذخیره‌سازی']].map(([k,l])=><MenuButton key={k} title={settings.futureCamera?.storage===k?'✓ '+l:l} compact onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),storage:k}})}/>)}</View>
        <View style={styles.choiceRow}>{[['auto','خودکار'],['on','روشن'],['off','خاموش']].map(([k,l])=><MenuButton key={k} title={settings.futureCamera?.flashMode===k?'✓ '+l:l} compact onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),flashMode:k}})}/>)}</View>
        <MenuButton title={settings.futureCamera?.dedicatedUsb===false?'درگاه USB ذخیره‌سازی جدا خاموش':'درگاه USB ذخیره‌سازی جدا رزرو شده'} onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),dedicatedUsb:settings.futureCamera?.dedicatedUsb===false}})}/>
        <View style={styles.choiceRow}>{[['dedicated','درگاه نور/فلش جدا'],['shared','اشتراکی']].map(([k,l])=><MenuButton key={k} title={settings.futureCamera?.lightPort===k?'✓ '+l:l} compact onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),lightPort:k}})}/>)}</View>
        <View style={styles.choiceRow}>{[['usb-host','USB ذخیره‌سازی'],['sd','کارت حافظه']].map(([k,l])=><MenuButton key={k} title={settings.futureCamera?.storagePort===k?'✓ '+l:l} compact onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),storagePort:k}})}/>)}</View>
        <MenuButton title={settings.futureCamera?.autoRecord===false?'ضبط خودکار خاموش':'ضبط خودکار روشن'} onPress={()=>update({futureCamera:{...(settings.futureCamera||{}),autoRecord:settings.futureCamera?.autoRecord===false}})}/>
        <TextInput value={settings.futureCamera?.storageLabel||''} onChangeText={v=>update({futureCamera:{...(settings.futureCamera||{}),storageLabel:v}})} placeholder="نام حافظهٔ آینده، مثلاً کارت ۱۲۸ گیگ" placeholderTextColor="#77809a" style={styles.searchInput}/ >
      </View>

      <View style={styles.card}><Text style={styles.cardTitle}>دروازه پیوند</Text><View style={styles.choiceRow}>{[['auto','خودکار'],['native','هسته داخلی'],['serial','پل سریال']].map(([k,l])=><MenuButton key={k} title={settings.bluetoothTransport?.mode===k?'✓ '+l:l} compact onPress={()=>update({bluetoothTransport:{...(settings.bluetoothTransport||{}),mode:k}})}/>)}</View><TextInput value={settings.bluetoothTransport?.address||''} onChangeText={v=>update({bluetoothTransport:{...(settings.bluetoothTransport||{}),address:v}})} placeholder="شناسه پیوند" placeholderTextColor="#77809a" style={styles.searchInput}/><View style={styles.choiceRow}><MenuButton title="پل آماده" compact onPress={()=>update({bluetoothTransport:{...(settings.bluetoothTransport||{}),mode:'serial',baud:'115200'}})}/><MenuButton title="هسته ارتقا" compact onPress={()=>update({bluetoothTransport:{...(settings.bluetoothTransport||{}),mode:'native'}})}/></View></View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>درگاه‌های کنترل اسپیکر</Text>
        <Text style={styles.smallHint}>بلوتوث برای پیوند مستقیم است. وای‌فای محلی برای کنترل داخل شبکه یا هات‌اسپات خود اسپیکر است و برای فرمان‌های محلی اینترنت لازم ندارد.</Text>
        <View style={styles.choiceRow}>{[['bluetooth','بلوتوث'],['wifi','وای‌فای']].map(([k,l]) => <MenuButton key={k} title={settings.transportMode===k?'✓ '+l:l} compact onPress={() => update({transportMode:k,lightTransportMode:k})} />)}</View>
        <View style={styles.choiceRow}>
          <MenuButton title={settings.wifiMode==='local'?'✓ وای‌فای محلی':'وای‌فای محلی'} compact onPress={()=>update({wifiMode:'local',wifiConnected:false})}/>
          <MenuButton title={settings.wifiMode==='internet'?'✓ اینترنتی':'اینترنتی'} compact onPress={()=>update({wifiMode:'internet',wifiConnected:false})}/>
        </View>
        <TextInput value={settings.wifiHost||''} onChangeText={v=>update({wifiHost:v,wifiConnected:false})} placeholder="نشانی اسپیکر در وای‌فای" placeholderTextColor="#77809a" style={styles.searchInput}/>
        <TextInput value={String(settings.wifiPort||'8080')} onChangeText={v=>update({wifiPort:v.replace(/[^0-9]/g,''),wifiConnected:false})} placeholder="درگاه" placeholderTextColor="#77809a" keyboardType="numeric" style={styles.searchInput}/ >
        <View style={styles.choiceRow}>
          <MenuButton title={settings.wifiConnected?'● متصل':'○ قطع'} compact onPress={async()=>{const ok=await checkWifiConnection(settings);update({wifiConnected:ok});Alert.alert(ok?'وای‌فای متصل است':'وای‌فای پیدا نشد',ok?'ارتباط با اسپیکر برقرار شد.':'نشانی و درگاه اسپیکر را بررسی کن.');}}/>
          <MenuButton title="آزمون پیوند وای‌فای" compact onPress={async()=>{const ok=await checkWifiConnection(settings);update({wifiConnected:ok});Alert.alert(ok?'وای‌فای متصل است':'وای‌فای پیدا نشد',ok?'ارتباط با اسپیکر برقرار شد.':'نشانی و درگاه اسپیکر را بررسی کن.');}}/>
        </View>
        <Text style={styles.smallHint}>فرمان روشن/خاموش و کنترل نور می‌تواند از همین وای‌فای محلی به اسپیکر برسد؛ اینترنت برای خود اسپیکر لازم نیست.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>گنجینه خودکار آوا</Text>
        <Text style={styles.smallHint}>{settings.musicPlaylist?.length||0} آهنگ در آوای نوا دیده می‌شود.</Text>
        <View style={styles.choiceRow}><MenuButton title="بازخوانی آهنگ‌های گوشی" onPress={async()=>{const r=await scanDeviceMusic(); if(!r.granted){Alert.alert('اجازه لازم است','برای آوردن خودکار آهنگ‌ها، اجازه دسترسی به فایل‌های صوتی گوشی را فعال کن.');return;} const existing=Array.isArray(settings.musicPlaylist)?settings.musicPlaylist:[]; const merged=[...r.tracks,...existing.filter(x=>!r.tracks.some(y=>y.uri===x.uri))]; update({musicPlaylist:merged,musicUri:merged[0]?.uri||null,musicName:merged[0]?.name||null,musicLibraryImported:true});}}/><MenuButton title="افزودن دستی آهنگ" compact onPress={pickAudio}/></View>
      </View>
    </PageShell>
  );
}

function CameraPage({ settings, onBack, update }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [usbBusy, setUsbBusy] = useState(false);
  const [lastFile, setLastFile] = useState('');
  const [message, setMessage] = useState('فلش را به USB وصل کن و «انتخاب محل ذخیره» را بزن.');
  const recordingRef = useRef(false);
  const chunkIndexRef = useRef(0);
  const quality = settings.futureCamera?.quality === '4k' ? '2160p' : (settings.futureCamera?.quality || '1080p');
  const chunkSeconds = Math.max(15, Math.min(300, Number(settings.futureCamera?.usbChunkSeconds || 60)));
  const usbUri = settings.futureCamera?.usbDirectoryUri || null;

  const chooseUsbFolder = async () => {
    try {
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return;
      update({ futureCamera: { ...(settings.futureCamera || {}), usbDirectoryUri: result.directoryUri, storage: 'usb', dedicatedUsb: true } });
      setMessage('محل ذخیرهٔ USB ثبت شد؛ آمادهٔ ضبط مجالس.');
    } catch (e) {
      Alert.alert('USB آماده نشد', 'فلش را با OTG به گوشی/هستهٔ اندرویدی وصل کن و دوباره محل ذخیره را انتخاب کن.');
    }
  };

  const saveChunkToUsb = async (uri) => {
    if (!usbUri) return false;
    const index = ++chunkIndexRef.current;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `Noba_Majles_${stamp}_${String(index).padStart(3,'0')}.mp4`;
    try {
      const target = await FileSystem.StorageAccessFramework.createFileAsync(usbUri, name, 'video/mp4');
      await FileSystem.copyAsync({ from: uri, to: target });
      setLastFile(name);
      return true;
    } catch (e) {
      setMessage('ذخیره روی USB ناموفق بود؛ ضبط ادامه دارد و این قطعه روی حافظهٔ موقت مانده است.');
      return false;
    }
  };

  const recordLoop = async () => {
    if (!cameraRef.current || recordingRef.current) return;
    if (!cameraReady) { Alert.alert('دوربین هنوز آماده نیست', 'یک لحظه صبر کن تا تصویر دوربین کامل آماده شود.'); return; }
    if (!usbUri) {
      Alert.alert('اول USB را انتخاب کن', 'فلش را وصل کن و محل ذخیرهٔ USB را انتخاب کن تا قطعه‌های ویدیو مستقیماً پس از هر بخش روی فلش کپی شوند.');
      return;
    }
    recordingRef.current = true;
    setRecording(true);
    setRecordedSeconds(0);
    setMessage('ضبط مجالس فعال است؛ فایل‌ها به صورت قطعه‌ای روی USB ذخیره می‌شوند.');
    try {
      while (recordingRef.current && cameraRef.current) {
        const result = await cameraRef.current.recordAsync({ maxDuration: chunkSeconds });
        if (!result?.uri) break;
        setRecordedSeconds(v => v + chunkSeconds);
        setUsbBusy(true);
        const ok = await saveChunkToUsb(result.uri);
        setUsbBusy(false);
        try { await FileSystem.deleteAsync(result.uri, { idempotent: true }); } catch (_) {}
        if (!ok) break;
      }
    } catch (e) {
      if (recordingRef.current) Alert.alert('ضبط متوقف شد', 'دوربین نتوانست قطعهٔ بعدی را ثبت کند.');
    } finally {
      recordingRef.current = false;
      setRecording(false);
      setUsbBusy(false);
    }
  };

  const stopRecording = () => {
    recordingRef.current = false;
    try { cameraRef.current?.stopRecording(); } catch (_) {}
  };

  useEffect(() => () => { recordingRef.current = false; try { cameraRef.current?.stopRecording(); } catch (_) {} }, []);

  if (!permission) return <View style={styles.cameraScreen}><Text style={styles.cameraTitle}>دوربین مجالس</Text></View>;
  if (!permission.granted) return <View style={styles.cameraScreen}><Text style={styles.cameraTitle}>دوربین مجالس</Text><Text style={styles.cameraHint}>این بخش برای فیلم‌برداری مراسم و ذخیرهٔ ویدیو روی USB آماده شده است.</Text><MenuButton title="اجازهٔ دوربین و میکروفون" onPress={requestPermission}/><MenuButton title="بازگشت" onPress={onBack}/></View>;
  return <View style={styles.cameraScreen}>
    <CameraView ref={cameraRef} style={styles.cameraView} facing="back" active videoQuality={quality} enableTorch={settings.futureCamera?.flashMode==='on'} videoStabilizationMode="auto" onCameraReady={()=>setCameraReady(true)} onMountError={()=>{setCameraReady(false);setMessage('دوربین روی این دستگاه آماده نشد.');}} />
    <View style={styles.cameraOverlay}>
      <View style={styles.cameraTopPanel}><Text style={styles.cameraTitle}>دوربین مجالس</Text><Text style={styles.cameraHint}>{usbUri ? 'USB آمادهٔ ذخیره' : 'USB انتخاب نشده'}</Text></View>
      <View style={styles.cameraCenterBadge}><Text style={styles.cameraTimer}>{recording ? '● ضبط زنده' : 'آماده'}</Text><Text style={styles.cameraHint}>{recordedSeconds ? `${Math.floor(recordedSeconds/60)}:${String(recordedSeconds%60).padStart(2,'0')}` : ' '}</Text></View>
      <View style={styles.cameraBottomPanel}>
        <View style={styles.choiceRow}><MenuButton title={usbUri ? '✓ محل USB' : 'انتخاب محل ذخیره'} compact onPress={chooseUsbFolder}/><MenuButton title={recording ? '■ پایان ضبط' : cameraReady ? '● شروع فیلم‌برداری' : '◌ آماده‌سازی دوربین'} compact onPress={recording ? stopRecording : recordLoop}/></View>
        <Text style={styles.cameraHint}>{usbBusy ? 'در حال انتقال قطعه به فلش…' : (lastFile ? `آخرین فایل: ${lastFile}` : message)}</Text>
        <Text style={styles.cameraHint}>کیفیت انتخابی: {settings.futureCamera?.quality==='4k'?'۴K':settings.futureCamera?.quality==='720p'?'۷۲۰p':'۱۰۸۰p'} • قطعه‌های {chunkSeconds} ثانیه‌ای</Text>
        <MenuButton title="بازگشت" compact onPress={onBack}/>
      </View>
    </View>
  </View>;
}

function PageShell({ pageKey='control', title, children, fixedLogo, logoUri, settings }) {
  const themeKey = PAGE_THEMES[pageKey] ? pageKey : 'control';
  return <VisualThemeContext.Provider value={themeKey}><View style={[styles.container,{backgroundColor:PAGE_THEMES[themeKey].bg}]}><AnimatedHeader pageKey={pageKey} title={title}/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pageContent}>{children}</ScrollView></View></VisualThemeContext.Provider>;
}

function AnimatedHeader({ pageKey, title }) {
  const spin=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const loop=Animated.loop(Animated.sequence([
      Animated.delay(5200),
      Animated.timing(spin,{toValue:1,duration:1700,useNativeDriver:true}),
      Animated.timing(spin,{toValue:0,duration:1,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[spin]);
  const rotate=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const preset=FIXED_HEADER_PRESETS[pageKey] ?? 0;
  const source=NAV_PRESETS[pageKey]?.[preset];
  return <View style={styles.headerBlock}>
    <Animated.View style={[styles.headerIconWrap,{transform:[{perspective:900},{rotateZ:rotate}]}]}>
      <View style={styles.headerIconHalo}/>
      {source ? <Image source={source} style={styles.headerCosmicImage}/> : <Text style={styles.headerGlyph}>{TOP_ICONS[pageKey]||'✦'}</Text>}
    </Animated.View>
    <Text style={styles.pageTitle}>{title}</Text>
  </View>;
}

function PageBackdrop({ page, settings }) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>setTick(v=>v+1),2200); return()=>clearInterval(id); },[]);
  const key = NAV_ITEMS.some(([k])=>k===page) ? page : 'control';
  const custom=settings.pageBackgrounds?.[key]; const preset=BACKGROUND_PRESETS[key][Number(settings.pageBackgroundPreset?.[key])||0];
  const imageStyle=key==='galaxy' ? styles.backgroundImageGalaxy : styles.backgroundImage;
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>{custom ? <Image source={{uri:custom}} style={imageStyle}/> : <Image source={preset} style={imageStyle}/>}<View style={styles.backgroundCosmicTint}/><Animated.View style={[styles.cosmicFloat, {transform:[{translateX:(tick%2)*18-9},{translateY:((tick+1)%3)*10-10}]}]}/><View style={styles.backgroundVignette}/></View>;
}

function BottomNav({ page, onOpen, settings }) {
  return <View style={styles.bottomNav}>{NAV_ITEMS.map(([key,label])=><BottomNavItem key={key} page={page} itemKey={key} label={label} onPress={()=>onOpen(key)} settings={settings}/>)}</View>;
}
function BottomNavItem({ page,itemKey,label,onPress,settings }) {
  const scale=useRef(new Animated.Value(1)).current;
  const orbit=useRef(new Animated.Value(0)).current;
  const glow=useRef(new Animated.Value(0)).current;
  const preset=Math.max(0,Math.min(4,Number(settings.buttonIconPreset?.[itemKey])||0));
  const custom=settings.buttonIcons?.[itemKey];
  useEffect(()=>{
    const pulse=Animated.loop(Animated.sequence([
      Animated.timing(scale,{toValue:1.035,duration:2400+itemKey.length*45,useNativeDriver:true}),
      Animated.timing(scale,{toValue:1,duration:2400+itemKey.length*45,useNativeDriver:true}),
    ]));
    const spin=Animated.loop(Animated.timing(orbit,{toValue:1,duration:14000,useNativeDriver:true}));
    const glowLoop=Animated.loop(Animated.sequence([Animated.timing(glow,{toValue:1,duration:1400,useNativeDriver:true}),Animated.timing(glow,{toValue:0,duration:1000,useNativeDriver:true}),Animated.delay(1200)]));
    pulse.start(); spin.start(); glowLoop.start();
    return()=>{pulse.stop();spin.stop();glowLoop.stop();};
  },[scale,orbit,itemKey]);
  const rotate=orbit.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const magicOpacity=glow.interpolate({inputRange:[0,1],outputRange:[0.30,1]});
  const theme=getTheme(itemKey);
  const navColor=theme.palette[preset%theme.palette.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={()=>Animated.spring(scale,{toValue:0.88,useNativeDriver:true}).start()}
      onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      onPress={onPress}
      style={styles.navPress}
      hitSlop={8}
    >
      <Animated.View style={[styles.navOrb,styles[`navShape${NAV_ITEMS.findIndex(([k])=>k===itemKey)%5}`],page===itemKey&&styles.navOrbActive,{borderColor:navColor,shadowColor:navColor,transform:[{scale}]}]}>
        <Animated.View pointerEvents="none" style={[styles.navOrbitRing,{borderColor:navColor,transform:[{rotate}]}]}>
          <View style={[styles.navOrbitDot,styles.navOrbitDotTop]}/>
          <View style={[styles.navOrbitDot,styles.navOrbitDotBottom]}/>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.navSparkRing,{borderColor:theme.glow2,opacity:magicOpacity,transform:[{rotate:rotate},{scale}]}]} />
        <Animated.View pointerEvents="none" style={[styles.navSpark,styles.navSparkA,{backgroundColor:navColor,opacity:magicOpacity}]} />
        <Animated.View pointerEvents="none" style={[styles.navSpark,styles.navSparkB,{backgroundColor:theme.glow2,opacity:magicOpacity}]} />
        <View style={styles.navIconCore}>
          {custom ? <Image source={{uri:custom}} style={styles.navCustomImage}/> : <Image source={NAV_PRESETS[itemKey][preset]} style={styles.navIconImage}/>}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getTheme(themeKey) {
  return PAGE_THEMES[themeKey] || PAGE_THEMES.control;
}

function CosmicTabButton({ glyph, label, index, active, onPress }) {
  const themeKey = React.useContext(VisualThemeContext);
  const theme = getTheme(themeKey);
  const [pressed, setPressed] = useState(false);
  const color = theme.palette[index % theme.palette.length];
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPressIn={()=>setPressed(true)} onPressOut={()=>setPressed(false)} onPress={onPress} style={styles.cosmicTabPress} hitSlop={6}>
    <View style={[styles.cosmicTabShell,{borderColor:color,shadowColor:color,transform:[{translateY:pressed?2:0},{perspective:650},{rotateX:active?'-3deg':'0deg'}],opacity:active?1:0.9}]}>
      <View style={[styles.cosmicTabOrbit,{borderColor:theme.glow2,transform:[{rotate:active?'360deg':'18deg'}]}]} />
      <Text style={[styles.cosmicTabGlyph,{color}]}>{glyph}</Text><Text style={styles.cosmicTabText}>{label}</Text>
    </View>
  </Pressable>;
}

function CosmicControlButton({ icon, label, onPress, active=false, large=false }) {
  const scale=useRef(new Animated.Value(1)).current;
  const themeKey=React.useContext(VisualThemeContext);
  const theme=getTheme(themeKey);
  const semantic = icon==='⏮' ? 0 : icon==='⏭' ? 1 : icon==='↑' ? 2 : icon==='↓' ? 3 : icon==='⏻' ? 1 : icon==='◌' ? 2 : 4;
  const color=theme.palette[semantic % theme.palette.length];
  const shape=(theme.shapes[semantic % theme.shapes.length] || 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPressIn={()=>Animated.spring(scale,{toValue:0.89,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} style={styles.cosmicControlPress} hitSlop={8}>
      <Animated.View style={[styles.cosmicControl,{width:large?98:82,height:large?98:82,borderRadius:large?49:41,borderColor:color,shadowColor:color,backgroundColor:theme.bg,transform:[{scale},{perspective:700},{rotateY:active?'8deg':'0deg'}]},styles[`buttonShape${shape}`]]}>
        <View style={[styles.cosmicControlOrbit,{borderColor:theme.glow2}]}/><Text style={[styles.cosmicControlGlyph,large&&styles.cosmicControlGlyphLarge,{color}]}>{icon}</Text><View style={[styles.cosmicControlSpark,{backgroundColor:color}]}/><Text style={styles.cosmicControlMicro}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function buttonVisualFor(title='', themeKey='control') {
  const t=String(title);
  const theme=getTheme(themeKey);
  let icon='✦', semantic=4;
  if(/بلوتوث|اتصال|قطع ارتباط|پیوند/.test(t)) { icon='⌁'; semantic=0; }
  else if(/روشن|بیدار|قدرت|سیستم سخت/.test(t)) { icon='⏻'; semantic=1; }
  else if(/خاموش|خواب/.test(t)) { icon='◌'; semantic=2; }
  else if(/گالری|تصویر|لوگو|آیکون|پس‌زمینه/.test(t)) { icon='◫'; semantic=3; }
  else if(/پیش‌فرض|بازگشت/.test(t)) { icon='↺'; semantic=4; }
  else if(/بعدی|جست‌وجو/.test(t)) { icon='⟫'; semantic=0; }
  else if(/قبلی/.test(t)) { icon='⟪'; semantic=1; }
  else if(/شنیدن|صدا|صدای/.test(t)) { icon='◉'; semantic=2; }
  else if(/حذف|پاک/.test(t)) { icon='×'; semantic=3; }
  else if(/رنگ|نور|نئون|افکت|گردون/.test(t)) { icon='✧'; semantic=3; }
  else if(/دوربین/.test(t)) { icon='◉'; semantic=4; }
  else if(/رمز|قفل|امنیت/.test(t)) { icon='◇'; semantic=4; }
  else if(/آهنگ|موسیقی|آوا/.test(t)) { icon='♫'; semantic=0; }
  const color=theme.palette[semantic % theme.palette.length];
  const shape=theme.shapes[semantic % theme.shapes.length] || 0;
  return {icon,color,shape};
}
function MenuButton({ title, onPress, iconUri, compact }) {
  const scale=useRef(new Animated.Value(1)).current;
  const themeKey=React.useContext(VisualThemeContext);
  const v=buttonVisualFor(title,themeKey);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPressIn={()=>Animated.spring(scale,{toValue:0.93,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} hitSlop={8}>
    <Animated.View style={[styles.button,styles[`buttonShape${v.shape}`],compact&&styles.compactButton,{borderColor:v.color,shadowColor:v.color,backgroundColor:getTheme(themeKey).bg,transform:[{scale},{perspective:680},{rotateX:'1deg'}]}]}>
      <View style={[styles.buttonAura,{backgroundColor:v.color}]}/><View style={[styles.buttonGlyphWrap,{borderColor:v.color,shadowColor:v.color}]}>{iconUri?<Image source={typeof iconUri==='string'?{uri:iconUri}:iconUri} style={styles.buttonIcon}/>:<Text style={[styles.buttonGlyph,{color:v.color,textShadowColor:v.color}]}>{v.icon}</Text>}</View>
      <Text style={styles.buttonText}>{title}</Text><View style={[styles.buttonDepthLine,{backgroundColor:getTheme(themeKey).glow2}]}/>
    </Animated.View>
  </Pressable>;
}

function CosmicPlaylistItem({ title, index, active, onPress }) {
  const themeKey=React.useContext(VisualThemeContext); const theme=getTheme(themeKey); const color=theme.palette[index%theme.palette.length];
  const scale=useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel={`پخش ${title}`} onPressIn={()=>Animated.spring(scale,{toValue:0.97,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} hitSlop={8}>
    <Animated.View style={[styles.playlistCosmic,{borderColor:active?color:'rgba(255,255,255,0.14)',shadowColor:color,backgroundColor:theme.bg,transform:[{scale},{perspective:700},{rotateX:active?'-2deg':'0deg'}]}]}>
      <View style={[styles.playlistIndex,{borderColor:color,backgroundColor:'rgba(0,0,0,0.22)'}]}><Text style={[styles.playlistIndexText,{color}]}>{String(index).padStart(2,'0')}</Text></View>
      <Text style={[styles.playlistTitle,active&&{color:'#fff'}]}>{title}</Text><Text style={[styles.playlistMark,{color}]}>{active?'◉':'◇'}</Text>
    </Animated.View>
  </Pressable>;
}

function AIActionButton({ icon, label, onPress, disabled }) {
  const theme=getTheme('ai'); const scale=useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPressIn={()=>Animated.spring(scale,{toValue:0.9,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} hitSlop={8}>
    <Animated.View style={[styles.aiActionButton,{borderColor:theme.palette[0],shadowColor:theme.palette[0],opacity:disabled?0.36:1,transform:[{scale},{perspective:650},{rotateY:'-7deg'}]}]}>
      <View style={[styles.aiActionOrbit,{borderColor:theme.palette[1]}]} /><Text style={[styles.aiActionGlyph,{color:theme.palette[0]}]}>{icon}</Text><Text style={styles.aiActionMicro}>ارسال</Text>
    </Animated.View>
  </Pressable>;
}

function AIListenButton({ active, onPressIn, onPressOut }) {
  const theme=getTheme('ai'); const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:900,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:900,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[pulse]);
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[1,1.07]});
  return <Pressable accessibilityRole="button" accessibilityLabel="نگه داشتن برای صحبت با زهره" onPressIn={onPressIn} onPressOut={onPressOut} style={styles.talkCore}>
    <Animated.View style={[styles.talkCosmicButton,{borderColor:active?theme.palette[0]:theme.palette[2],shadowColor:active?theme.palette[0]:theme.palette[2],transform:[{scale},{perspective:720},{rotateY:active?'10deg':'0deg'}]}]}>
      <View style={[styles.talkOrbit3,{borderColor:theme.palette[1]}]}><View style={[styles.talkOrbit2,{borderColor:theme.palette[3]}]}><View style={[styles.talkOrbit1,{borderColor:theme.palette[0]}]}><Text style={[styles.talkGlyph,{color:theme.palette[0]}]}>⌁</Text></View></View></View>
      <Text style={styles.talkLabel}>{active?'گوش می‌دهم':'برای صحبت لمس کن'}</Text>
    </Animated.View>
  </Pressable>;
}

function AIChoiceButton({ index, glyph, label, active, onPress }) {
  const theme=getTheme('ai'); const color=theme.palette[index%theme.palette.length]; const scale=useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPressIn={()=>Animated.spring(scale,{toValue:0.91,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} hitSlop={8}>
    <Animated.View style={[styles.aiChoice,{borderColor:active?color:'rgba(255,255,255,0.16)',shadowColor:color,backgroundColor:active?'rgba(23,48,45,0.86)':theme.bg,transform:[{scale},{perspective:700},{rotateX:active?'-3deg':'0deg'}]}]}>
      <View style={[styles.aiChoiceOrbit,{borderColor:color}]} /><Text style={[styles.aiChoiceGlyph,{color}]}>{glyph}</Text><Text style={styles.voiceChipText}>{label}</Text>
    </Animated.View>
  </Pressable>;
}

function CosmicColorChip({ color, index, active, onPress }) {
  const scale=useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel={`انتخاب رنگ ${color}`} onPressIn={()=>Animated.spring(scale,{toValue:0.84,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress}>
    <Animated.View style={[styles.colorCosmicChip,{backgroundColor:color,borderColor:active?'#fff':'rgba(255,255,255,0.20)',shadowColor:color,transform:[{scale},{perspective:600},{rotateY:`${(index%3)-1*8}deg`}]}]}><View style={styles.colorChipInner}/><Text style={styles.colorChipIndex}>{index+1}</Text></Animated.View>
  </Pressable>;
}

function CosmicEffectTile({ glyph, name, index, active, toneIndex, onPress, compact=false }) {
  const theme=React.useContext(VisualThemeContext); const t=getTheme(theme); const color=t.palette[toneIndex%t.palette.length]; const scale=useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel={`افکت ${index} ${name}`} onPressIn={()=>Animated.spring(scale,{toValue:0.9,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} hitSlop={6}>
    <Animated.View style={[styles.effectCosmicTile,compact&&styles.effectCosmicTileCompact,{borderColor:active?color:'rgba(255,255,255,0.13)',shadowColor:color,backgroundColor:t.bg,transform:[{scale},{perspective:700},{rotateX:active?'-6deg':'0deg'},{rotateY:`${(toneIndex%3)-1}deg`}]}]}>
      <View style={[styles.effectOrbitHalo,{borderColor:color}]}/><Text style={[styles.effectGlyph,{color}]}>{glyph}</Text><Text style={styles.effectName}>{name}</Text><Text style={[styles.effectIndex,{color}]}>{String(index).padStart(2,'0')}</Text>
    </Animated.View>
  </Pressable>;
}

function CosmicPowerButton({ powered, onPress }) {
  const scale=useRef(new Animated.Value(1)).current; const spin=useRef(new Animated.Value(0)).current;
  const theme=getTheme('bluetooth'); const color=powered?theme.palette[2]:theme.palette[3];
  useEffect(()=>{const loop=Animated.loop(Animated.timing(spin,{toValue:1,duration:7000,useNativeDriver:true}));loop.start();return()=>loop.stop();},[spin]);
  const rotate=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <Pressable accessibilityRole="button" accessibilityLabel="روشن و خاموش کردن اسپیکر" accessibilityState={{checked:powered}} onPressIn={()=>Animated.spring(scale,{toValue:0.9,useNativeDriver:true}).start()} onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()} onPress={onPress} style={styles.powerCosmicPress}>
    <Animated.View style={[styles.powerCosmicButton,{width:138,height:138,borderRadius:69,borderColor:color,shadowColor:color,transform:[{scale},{perspective:720},{rotateY:powered?'6deg':'-6deg'}]}]}>
      <Animated.View style={[styles.powerCosmicOrbitA,{borderColor:theme.palette[0],transform:[{rotate}]}]}/><Animated.View style={[styles.powerCosmicOrbitB,{borderColor:theme.palette[1],transform:[{rotate:rotate}]}]}/>
      <Image source={require('./assets/ui/power_cosmic.png')} style={styles.powerCosmicIconSmall}/><View style={[styles.powerCosmicCore,{backgroundColor:powered?theme.palette[2]:theme.palette[4],shadowColor:color}]}/><Text style={[styles.powerCosmicState,{color}]}>نوا {powered?'بیدار':'خواب'}</Text>
    </Animated.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#07152e'}, backgroundShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,30,0.48)'}, backgroundImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',resizeMode:'contain'}, backgroundVignette:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,30,0.28)'},backgroundCosmicTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(34,20,82,0.10)'}, cosmicFloat:{position:'absolute',width:190,height:190,borderRadius:95,borderWidth:1,borderColor:'rgba(160,130,255,0.18)',right:-55,top:150},
  splash:{flex:1,backgroundColor:'#07152e',justifyContent:'center',alignItems:'center'}, splash3D:{width:190,height:190,alignItems:'center',justifyContent:'center',marginBottom:12}, splashMark:{color:'#8ea8ff',fontSize:86}, splashImage:{width:180,height:180,resizeMode:'contain'}, splashBrand:{color:'#fff',fontSize:34,fontWeight:'700'},splashSub:{color:'#a9b3d4',fontSize:13,marginTop:2,letterSpacing:1},splashIdentity:{alignItems:'center',justifyContent:'center',marginTop:2},splashNoba:{color:'#fff',fontSize:34,fontWeight:'800',letterSpacing:3,textShadowColor:'#6c8dff',textShadowRadius:16},splashKorosh:{color:'#aab9e8',fontSize:13,letterSpacing:2,marginTop:2},splashSignature:{position:'absolute',left:18,right:18,bottom:18,alignItems:'center'},splashSignatureText:{color:'#b6c3e4',fontSize:11,letterSpacing:1},signature:{position:'absolute',left:18,bottom:24,color:'#a9b3d4',fontSize:11},
  container:{flex:1,padding:18,paddingBottom:96}, logo:{color:'#c6d2ff',fontSize:56,textAlign:'center',marginTop:22}, homeLogo:{width:72,height:72,resizeMode:'contain',alignSelf:'center',marginTop:18}, brand:{color:'#fff',fontSize:30,fontWeight:'700',textAlign:'center',marginTop:6}, device:{color:'#b8c2df',fontSize:17,textAlign:'center',marginBottom:22}, homeHero:{alignSelf:'center',width:'92%',marginTop:36,padding:24,borderRadius:28,borderWidth:1,borderColor:'rgba(150,140,255,0.35)',backgroundColor:'rgba(14,25,57,0.72)',alignItems:'center'}, homeHeroGlyph:{color:'#d9d4ff',fontSize:52},homeHeroTitle:{color:'#fff',fontSize:23,fontWeight:'700',marginTop:8},homeHeroText:{color:'#aeb9db',fontSize:14,textAlign:'center',marginTop:8},
  galaxyTabs:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},galaxyHero:{alignItems:'center',justifyContent:'center',paddingVertical:8},galaxyHeroOrb:{width:108,height:108,borderRadius:59,borderWidth:2,backgroundColor:'rgba(10,8,34,0.82)',alignItems:'center',justifyContent:'center',shadowOpacity:0.58,shadowRadius:20,elevation:10},galaxyHeroOrbit:{position:'absolute',width:96,height:42,borderRadius:60,borderWidth:1,borderColor:'rgba(117,225,255,0.42)',transform:[{rotate:'-24deg'}]},galaxyHeroGlyph:{color:'#fff',fontSize:40,textShadowColor:'#9b7cff',textShadowRadius:14},galaxyHeroLabel:{color:'#cdd7ff',fontSize:9,letterSpacing:2,marginTop:2},galaxyCard:{marginHorizontal:4,marginVertical:5,padding:10,borderRadius:22,borderWidth:1,borderColor:'rgba(150,170,255,0.22)',backgroundColor:'rgba(7,13,32,0.76)'},galaxySliderBox:{marginTop:8,paddingHorizontal:3},galaxyEffectGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',paddingHorizontal:1},galaxyWheelRow:{flexDirection:'row',justifyContent:'center',alignItems:'center'},backgroundImageGalaxy:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',resizeMode:'contain'},pageContent:{paddingBottom:26}, headerBlock:{alignItems:'center',paddingTop:12,paddingBottom:10},headerIconWrap:{width:82,height:82,alignItems:'center',justifyContent:'center',borderRadius:47},headerIconHalo:{position:'absolute',width:90,height:90,borderRadius:45,borderWidth:1,borderColor:'rgba(255,255,255,0.14)',shadowColor:'#9b7cff',shadowOpacity:0.38,shadowRadius:18,elevation:8},headerGlyph:{color:'#eef1ff',fontSize:56,textShadowColor:'#7f78ff',textShadowRadius:18},headerLogoImage:{width:84,height:84,resizeMode:'contain'},headerCosmicImage:{width:72,height:72,borderRadius:42,resizeMode:'contain',shadowColor:'#9b7cff',shadowOpacity:0.62,shadowRadius:20,elevation:10}, pageTitle:{color:'#fff',fontSize:28,fontWeight:'700',textAlign:'center',marginTop:4},
  button:{position:'relative',overflow:'hidden',backgroundColor:'rgba(9,18,42,0.88)',paddingVertical:9,paddingHorizontal:12,marginVertical:6,borderWidth:1,minHeight:64,justifyContent:'center',alignItems:'center',shadowOpacity:0.38,shadowRadius:18,elevation:8},compactButton:{minHeight:58,flex:1,marginHorizontal:3},buttonText:{color:'#f6f4ff',fontSize:14,textAlign:'center',fontWeight:'600',marginTop:3},buttonGlyphWrap:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,13,32,0.55)',borderWidth:1,borderColor:'rgba(255,255,255,0.16)'},buttonGlyph:{color:'#fff',fontSize:20,fontWeight:'700',textShadowColor:'#a984ff',textShadowRadius:10},buttonIcon:{width:28,height:28,resizeMode:'contain'},buttonAura:{position:'absolute',width:'78%',height:2,top:0,borderRadius:99,backgroundColor:'rgba(255,255,255,0.42)'},buttonTone0:{borderColor:'rgba(83,235,255,0.55)',shadowColor:'#53ebff'},buttonTone1:{borderColor:'rgba(145,255,195,0.55)',shadowColor:'#91ffc3'},buttonTone2:{borderColor:'rgba(255,113,195,0.55)',shadowColor:'#ff71c3'},buttonTone3:{borderColor:'rgba(255,211,105,0.55)',shadowColor:'#ffd369'},buttonTone4:{borderColor:'rgba(176,137,255,0.58)',shadowColor:'#b089ff'},buttonShape0:{borderRadius:22},buttonShape1:{borderRadius:14},buttonShape2:{borderRadius:30},buttonShape3:{borderTopLeftRadius:30,borderBottomRightRadius:30,borderTopRightRadius:12,borderBottomLeftRadius:12},buttonShape4:{borderTopLeftRadius:10,borderTopRightRadius:28,borderBottomRightRadius:10,borderBottomLeftRadius:28},
  card:{backgroundColor:'rgba(10,20,45,0.76)',borderRadius:24,borderWidth:1,borderColor:'rgba(130,145,230,0.28)',padding:16,marginVertical:10,shadowColor:'#687cff',shadowOpacity:0.16,shadowRadius:18,elevation:4},cardTitle:{color:'#fff',fontSize:19,textAlign:'center',marginBottom:8},cardText:{color:'#c1c9e0',fontSize:14,textAlign:'center',lineHeight:22},pageSub:{color:'#aeb9db',fontSize:15,textAlign:'center',marginTop:4,lineHeight:22},smallHint:{color:'#8995b6',fontSize:12,textAlign:'center',lineHeight:19,marginTop:8},tinyHint:{color:'#7785aa',fontSize:10,textAlign:'center',marginTop:2}, settingTile:{marginTop:10,padding:10,borderRadius:20,borderWidth:1,borderColor:'rgba(100,120,210,0.20)',backgroundColor:'rgba(8,18,42,0.55)'},settingTileTitle:{color:'#edf0ff',fontSize:15,textAlign:'center',marginBottom:4},choiceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'stretch'},presetStrip:{paddingVertical:7,paddingHorizontal:3},presetThumb:{width:62,height:62,borderRadius:31,marginHorizontal:4,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(120,135,220,0.25)',backgroundColor:'rgba(8,17,40,0.65)'},presetThumbActive:{borderColor:'#c3a8ff',shadowColor:'#9b7cff',shadowOpacity:0.7,shadowRadius:10,elevation:6},presetImage:{width:56,height:56,borderRadius:28,resizeMode:'contain'},
  musicArtworkStage:{alignSelf:'center',alignItems:'center',justifyContent:'center',marginTop:10},musicHaloRing:{position:'absolute',borderWidth:2,borderColor:'rgba(126,227,255,0.45)',shadowColor:'#7fe9ff',shadowOpacity:0.55,shadowRadius:20},musicImageFrame:{alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:2,borderColor:'#a88cff',shadowColor:'#8b7dff',shadowOpacity:0.65,shadowRadius:28,elevation:16},musicWaveAura:{position:'absolute',flexDirection:'row',alignItems:'center',justifyContent:'space-around',width:250,height:250,borderRadius:125,borderWidth:1,borderColor:'rgba(255,113,195,0.28)'},musicWaveBar:{width:4,height:32,borderRadius:2,backgroundColor:'#9beaff'},musicOrbitRing:{position:'absolute',width:250,height:250,borderRadius:125,borderWidth:1,borderColor:'rgba(176,137,255,0.4)'},musicOrbitDot:{position:'absolute',top:-5,left:123,width:10,height:10,borderRadius:5,backgroundColor:'#fff',shadowColor:'#ff71c3',shadowOpacity:0.9,shadowRadius:10},musicVisual:{width:210,height:210,borderRadius:105,backgroundColor:'#101b3a',borderWidth:2,borderColor:'#7183ff',alignSelf:'center',alignItems:'center',justifyContent:'center',marginTop:18,overflow:'hidden',shadowColor:'#8b7dff',shadowOpacity:0.55,shadowRadius:26,elevation:14},musicImage:{width:'100%',height:'100%',borderRadius:90},musicVisualMark:{color:'#9ab0ff',fontSize:72},visualNote:{color:'#aab4d0',fontSize:13,textAlign:'center',marginTop:12},nowPlaying:{color:'#fff',fontSize:17,textAlign:'center',marginTop:16},row:{flexDirection:'row',justifyContent:'space-between',marginTop:8},listItem:{color:'#aab4d0',fontSize:14,paddingVertical:8,textAlign:'right'},listItemActive:{color:'#fff'},
  inputBar:{flexDirection:'row',alignItems:'flex-end',backgroundColor:'rgba(12,23,49,0.88)',borderWidth:1,borderColor:'#3a4674',borderRadius:22,padding:6,marginTop:10},input:{flex:1,color:'#fff',minHeight:42,maxHeight:100,paddingHorizontal:12,paddingVertical:8,textAlignVertical:'center'},searchInput:{color:'#fff',backgroundColor:'rgba(12,23,49,0.86)',borderWidth:1,borderColor:'#354268',borderRadius:15,minHeight:48,paddingHorizontal:12,marginTop:8,textAlign:'right'},sendButton:{width:42,height:42,borderRadius:21,backgroundColor:'#596cff',alignItems:'center',justifyContent:'center'},disabledButton:{opacity:0.35},sendGlyph:{color:'#eef2ff',fontSize:20},
  aiHero:{height:225,alignItems:'center',justifyContent:'center',marginTop:4},aiRing:{position:'absolute',borderWidth:1,borderColor:'#748cff',borderRadius:999},aiRingOuter:{width:210,height:210},aiRingMid:{width:158,height:158,borderColor:'#b47cff'},aiCore:{width:108,height:108,borderRadius:54,backgroundColor:'#121b3b',borderWidth:2,borderColor:'#8296ff',alignItems:'center',justifyContent:'center',shadowColor:'#7187ff',shadowOpacity:0.65,shadowRadius:22,elevation:12},aiCoreOrbit:{width:76,height:76,borderRadius:38,borderWidth:1,borderColor:'#b78cff',alignItems:'center',justifyContent:'center'},aiCoreGlyph:{color:'#eef1ff',fontSize:40},aiState:{color:'#b8c4ef',fontSize:13,position:'absolute',bottom:2},safetyStrip:{alignSelf:'center',flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:7,borderRadius:18,backgroundColor:'#101b32',borderWidth:1,borderColor:'#27365d',marginBottom:8},safetyDot:{width:9,height:9,borderRadius:5,marginLeft:7},safetyText:{color:'#dce3f7',fontSize:12},green:{backgroundColor:'#55e69b'},yellow:{backgroundColor:'#ffd45a'},red:{backgroundColor:'#ff5d72'},voiceHint:{color:'#8d99b9',fontSize:12,textAlign:'center',marginTop:7},talkCore:{width:118,height:118,borderRadius:59,alignSelf:'center',alignItems:'center',justifyContent:'center',marginVertical:18,backgroundColor:'#101a36',borderWidth:1,borderColor:'#667dff',shadowColor:'#6c80ff',shadowOpacity:0.55,shadowRadius:20,elevation:10},talkCoreActive:{backgroundColor:'#1b2853',borderColor:'#d08cff',transform:[{scale:1.06}]},talkOrbit3:{width:94,height:94,borderRadius:47,borderWidth:1,borderColor:'#3d56a6',alignItems:'center',justifyContent:'center'},talkOrbit2:{width:72,height:72,borderRadius:36,borderWidth:1,borderColor:'#7351aa',alignItems:'center',justifyContent:'center'},talkOrbit1:{width:50,height:50,borderRadius:25,backgroundColor:'#202e5c',alignItems:'center',justifyContent:'center'},talkGlyph:{color:'#f2f4ff',fontSize:34,transform:[{rotate:'-90deg'}]},voiceRow:{flexDirection:'row',justifyContent:'center',gap:8,marginTop:2},voiceChip:{minWidth:82,paddingVertical:9,paddingHorizontal:10,borderRadius:18,borderWidth:1,borderColor:'#26365f',backgroundColor:'#0d1830',alignItems:'center'},voiceChipActive:{borderColor:'#8d8fff',backgroundColor:'#18234b'},voiceChipGlyph:{color:'#b9c7ff',fontSize:19},voiceChipText:{color:'#dce2f7',fontSize:12,marginTop:2},routeChip:{minWidth:112,paddingVertical:9,paddingHorizontal:12,borderRadius:18,borderWidth:1,borderColor:'#26365f',backgroundColor:'#0d1830',alignItems:'center',flexDirection:'row',justifyContent:'center',gap:7,marginTop:8},routeChipActive:{borderColor:'#a784ff',backgroundColor:'#1a2149'},routeGlyph:{color:'#c7d0ff',fontSize:19},aiResponse:{color:'#ddd',fontSize:15,lineHeight:23,backgroundColor:'rgba(13,23,48,0.82)',borderRadius:16,padding:14,marginTop:14},
  securityGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',marginTop:8},identityTile:{marginTop:10,padding:12,borderRadius:18,borderWidth:1,borderColor:'#344579',backgroundColor:'rgba(13,24,54,0.65)'},identityLabel:{color:'#cbd5ff',fontSize:12,textAlign:'right'},identityPhrase:{color:'#fff',fontSize:14,textAlign:'right',marginTop:5},  musicProgressWrap:{marginTop:14},musicProgressTrack:{height:18,borderRadius:9,backgroundColor:'#17224a',borderWidth:1,borderColor:'#5264aa',overflow:'hidden',justifyContent:'center'},musicProgressFill:{height:'100%',backgroundColor:'#7f8cff',borderRadius:9},musicProgressOrb:{position:'absolute',width:18,height:18,borderRadius:9,marginLeft:-9,backgroundColor:'#fff',borderWidth:3,borderColor:'#b18cff',shadowColor:'#a784ff',shadowOpacity:0.8,shadowRadius:10,elevation:5},timeRow:{flexDirection:'row',justifyContent:'space-between',marginTop:5},timeText:{color:'#aab4d0',fontSize:11},usbCore:{alignItems:'center',justifyContent:'center',height:260},usbOrb:{width:150,height:150,borderRadius:75,borderWidth:2,borderColor:'#7183ff',alignItems:'center',justifyContent:'center',shadowColor:'#7183ff',shadowOpacity:0.55,shadowRadius:26,elevation:12},usbOrbConnected:{borderColor:'#59e6a4',shadowColor:'#59e6a4'},usbGlyph:{color:'#fff',fontSize:60},usbState:{color:'#fff',fontSize:16,textAlign:'center',marginTop:18},equalizerMini:{height:95,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',marginTop:18,paddingHorizontal:12},equalizerBar:{width:8,borderRadius:4,backgroundColor:'#8178ff',shadowColor:'#8178ff',shadowOpacity:0.6,shadowRadius:8,elevation:4},
  bottomNav:{zIndex:100,position:'absolute',left:10,right:10,bottom:10,height:82,borderRadius:28,borderWidth:1,borderColor:'rgba(145,155,245,0.28)',backgroundColor:'rgba(7,15,35,0.92)',flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:5,shadowColor:'#667aff',shadowOpacity:0.25,shadowRadius:20,elevation:12},navPress:{flex:1,alignItems:'center',justifyContent:'center'},navSparkRing:{position:'absolute',width:'98%',height:'98%',borderRadius:999,borderWidth:1,opacity:0.55},navSpark:{position:'absolute',width:5,height:5,borderRadius:3,shadowOpacity:0.8,shadowRadius:6},navSparkA:{top:7,right:15},navSparkB:{bottom:9,left:13},navOrb:{width:'100%',maxWidth:62,maxHeight:62,aspectRatio:1,borderRadius:999,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(115,130,220,0.22)',backgroundColor:'rgba(8,16,38,0.62)',shadowColor:'#7b83ff',shadowOpacity:0.24,shadowRadius:12,elevation:6},navOrbActive:{borderColor:'#b49cff',backgroundColor:'rgba(62,52,125,0.58)',shadowColor:'#9d82ff',shadowOpacity:0.7,shadowRadius:18,elevation:10},navShape0:{borderTopLeftRadius:24,borderBottomRightRadius:14},navShape1:{borderRadius:31},navShape2:{borderTopRightRadius:24,borderBottomLeftRadius:14},navShape3:{borderTopLeftRadius:14,borderTopRightRadius:28,borderBottomRightRadius:14,borderBottomLeftRadius:28},navShape4:{borderTopLeftRadius:28,borderTopRightRadius:14,borderBottomRightRadius:28,borderBottomLeftRadius:14},navOrbitRing:{position:'absolute',width:'108%',height:'108%',borderRadius:999,borderWidth:1,borderColor:'rgba(178,155,255,0.28)'},navOrbitDot:{position:'absolute',width:5,height:5,borderRadius:3,backgroundColor:'#e9e3ff',shadowColor:'#b18cff',shadowOpacity:0.9,shadowRadius:6},navOrbitDotTop:{top:-3,left:'45%'},navOrbitDotBottom:{bottom:-3,right:'18%'},navIconCore:{width:'84%',height:'84%',borderRadius:999,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,12,30,0.28)'},navIconImage:{width:'90%',height:'90%',resizeMode:'contain'},navCustomImage:{width:'88%',height:'88%',borderRadius:999,resizeMode:'contain'},musicControls:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10,marginTop:12,marginBottom:6},cosmicControlPress:{alignItems:'center',justifyContent:'center'},cosmicControl:{alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(158,144,255,0.42)',backgroundColor:'rgba(10,20,45,0.88)',shadowColor:'#8b7dff',shadowOpacity:0.42,shadowRadius:18,elevation:9},cosmicControlActive:{borderColor:'#d7a8ff',backgroundColor:'rgba(50,38,94,0.92)',shadowColor:'#d08cff',shadowOpacity:0.72,shadowRadius:24,elevation:12},cosmicControlOrbit:{position:'absolute',width:'78%',height:'78%',borderRadius:999,borderWidth:1,borderColor:'rgba(115,239,255,0.28)'},cosmicControlGlyph:{color:'#f5f3ff',fontSize:26,fontWeight:'700',textShadowColor:'#9f82ff',textShadowRadius:10},cosmicControlGlyphLarge:{fontSize:34},cosmicControlSpark:{position:'absolute',top:9,right:13,width:5,height:5,borderRadius:3,backgroundColor:'#d7f6ff',shadowColor:'#8be7ff',shadowOpacity:0.9,shadowRadius:7},cosmicControlMicro:{position:'absolute',bottom:6,color:'#8e9bc0',fontSize:7,letterSpacing:0.6},cosmicControlPrev:{borderTopLeftRadius:28,borderBottomRightRadius:28,borderTopRightRadius:14,borderBottomLeftRadius:14,borderColor:'rgba(83,235,255,0.55)',shadowColor:'#53ebff'},cosmicControlNext:{borderTopRightRadius:28,borderBottomLeftRadius:28,borderTopLeftRadius:14,borderBottomRightRadius:14,borderColor:'rgba(255,113,195,0.55)',shadowColor:'#ff71c3'},cosmicControlUp:{borderRadius:22,borderColor:'rgba(176,137,255,0.58)',shadowColor:'#b089ff'},cosmicControlDown:{borderRadius:22,borderColor:'rgba(255,211,105,0.55)',shadowColor:'#ffd369'},cosmicControlPower:{borderTopLeftRadius:42,borderBottomRightRadius:42,borderTopRightRadius:18,borderBottomLeftRadius:18,borderColor:'rgba(110,255,190,0.58)',shadowColor:'#6effbe'},cosmicControlHalo:{borderRadius:18,borderWidth:2,borderColor:'rgba(255,113,195,0.55)',shadowColor:'#ff71c3'},cosmicControlPlay:{borderTopLeftRadius:18,borderTopRightRadius:38,borderBottomRightRadius:18,borderBottomLeftRadius:38,borderColor:'rgba(176,137,255,0.58)',shadowColor:'#b089ff'},logoSettingPreview:{width:94,height:94,borderRadius:47,alignSelf:'center',alignItems:'center',justifyContent:'center',marginVertical:8,borderWidth:1,borderColor:'rgba(166,145,255,0.38)',backgroundColor:'rgba(8,17,40,0.7)',shadowColor:'#9b7cff',shadowOpacity:0.45,shadowRadius:18,elevation:8},logoSettingImage:{width:82,height:82,borderRadius:41,resizeMode:'contain'},logoSettingGlyph:{color:'#dcd5ff',fontSize:42,textShadowColor:'#9b7cff',textShadowRadius:14},appIconStrip:{paddingVertical:10,paddingHorizontal:2},appIconChoice:{width:122,marginHorizontal:5,padding:8,borderRadius:22,borderWidth:1,borderColor:'#293761',backgroundColor:'rgba(9,18,42,0.78)',alignItems:'center'},appIconChoiceActive:{borderColor:'#b38cff',shadowColor:'#a784ff',shadowOpacity:0.7,shadowRadius:14,elevation:8,backgroundColor:'rgba(48,34,91,0.86)'},appIconChoiceLocked:{opacity:0.38},appIconChoiceImage:{width:92,height:92,resizeMode:'contain'},appIconChoiceText:{color:'#e9edff',fontSize:11,textAlign:'center',marginTop:5},appIconChoiceLock:{color:'#75ffc8',fontSize:9,marginTop:3},logoLockBadge:{marginTop:10,padding:12,borderWidth:1,borderColor:'rgba(210,190,255,0.35)',borderRadius:18,backgroundColor:'rgba(18,12,38,0.58)',flexDirection:'row',alignItems:'center',gap:8},logoLockGlyph:{fontSize:22,color:'#d8c6ff',textShadowColor:'#a87dff',textShadowRadius:10},
  splashShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,8,24,0.48)'},splashOrbitOuter:{position:'absolute',width:300,height:300,borderRadius:150,borderWidth:1,borderColor:'rgba(102,231,255,0.28)',borderStyle:'dashed'},splashLogoAura:{position:'absolute',width:210,height:210,borderRadius:105,borderWidth:2,borderColor:'rgba(176,137,255,0.35)',shadowColor:'#7f8cff',shadowOpacity:0.8,shadowRadius:30,elevation:12},splashProjectLine:{color:'#c7d2ff',fontSize:11,letterSpacing:2.2,marginTop:4},
  btHeroFrame:{width:210,height:210,borderRadius:105,alignItems:'center',justifyContent:'center',position:'relative'},btHeroOrbitA:{position:'absolute',width:200,height:80,borderRadius:100,borderWidth:1,borderColor:'rgba(85,235,255,0.45)',transform:[{rotate:'18deg'}]},btHeroOrbitB:{position:'absolute',width:160,height:70,borderRadius:100,borderWidth:1,borderColor:'rgba(207,132,255,0.42)',transform:[{rotate:'-32deg'}]},btHeroSparkTop:{position:'absolute',width:7,height:7,borderRadius:4,backgroundColor:'#baf7ff',top:20,right:46,shadowColor:'#53ebff',shadowOpacity:1,shadowRadius:10},btHeroSparkBottom:{position:'absolute',width:5,height:5,borderRadius:3,backgroundColor:'#ffd5ef',bottom:30,left:48,shadowColor:'#ff71c3',shadowOpacity:1,shadowRadius:9},btHeroImageLarge:{width:150,height:150,resizeMode:'contain',zIndex:2},btProjectLine:{color:'#a9e9ff',fontSize:10,letterSpacing:2.4,marginTop:4},btHint:{color:'#8e9bc0',fontSize:11,textAlign:'center',marginTop:7},btRingInner:{width:150,height:150,borderRadius:75,borderWidth:1,borderColor:'rgba(255,255,255,0.16)',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(9,17,39,0.35)'},btGlyphSmall:{color:'#8fa1c9',fontSize:9,letterSpacing:2,marginTop:6},btIdentityCard:{marginTop:10,padding:16,borderRadius:28,borderWidth:1,borderColor:'rgba(112,229,255,0.22)',backgroundColor:'rgba(8,17,40,0.60)',shadowColor:'#6e80ff',shadowOpacity:0.18,shadowRadius:18},btIdentityTitle:{color:'#fff',fontSize:17,textAlign:'center'},btIdentityText:{color:'#aab7d9',fontSize:12,textAlign:'center',lineHeight:20,marginTop:6},
  colorWheelImage:{position:'absolute',width:190,height:190},colorWheelMarker:{position:'absolute',width:22,height:22,borderRadius:11,borderWidth:3,backgroundColor:'rgba(8,15,35,0.75)',alignItems:'center',justifyContent:'center',shadowOpacity:0.9,shadowRadius:12,elevation:7},colorWheelMarkerCore:{width:10,height:10,borderRadius:5},colorSelectedCore:{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.7)',shadowOpacity:0.8,shadowRadius:10},colorOrbHex:{color:'#fff',fontSize:10,fontWeight:'700',marginTop:5},
  lightOrbOrbit:{position:'absolute',width:112,height:54,borderRadius:80,borderWidth:1,borderColor:'rgba(255,255,255,0.28)',transform:[{rotate:'-28deg'}]},lightOrbLabel:{color:'#c9d3f6',fontSize:9,letterSpacing:2,marginTop:4},cardInner:{marginTop:8,padding:10,borderRadius:18,borderWidth:1,borderColor:'rgba(120,140,230,0.18)',backgroundColor:'rgba(7,14,32,0.42)'},wheelControlRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingVertical:12},wheelStatusRow:{flexDirection:'row',justifyContent:'space-around'},wheelStatus:{color:'#aeb9dc',fontSize:11,textAlign:'center',flex:1},effectCosmicTileCompact:{width:60,height:60,borderRadius:18,margin:3},effectName:{color:'#aab7d9',fontSize:8,textAlign:'center',marginTop:2,paddingHorizontal:2},effectTone0:{borderColor:'rgba(82,234,255,0.35)'},effectTone1:{borderColor:'rgba(178,130,255,0.38)'},effectTone2:{borderColor:'rgba(255,111,197,0.36)'},effectTone3:{borderColor:'rgba(255,211,103,0.38)'},effectTone4:{borderColor:'rgba(110,255,190,0.35)'},
  pinScreen:{flex:1,backgroundColor:'#07152e',alignItems:'center',justifyContent:'center',padding:28},pinOrb:{width:118,height:118,borderRadius:59,borderWidth:2,borderColor:'#9b7cff',alignItems:'center',justifyContent:'center',shadowColor:'#9b7cff',shadowOpacity:0.7,shadowRadius:25,elevation:12},pinGlyph:{color:'#fff',fontSize:48},pinTitle:{color:'#fff',fontSize:28,fontWeight:'700',marginTop:18},pinHint:{color:'#aab4d0',fontSize:14,textAlign:'center',marginTop:8,marginBottom:12},pinInput:{width:'100%',height:54,borderRadius:20,borderWidth:1,borderColor:'#5264aa',backgroundColor:'#0d1938',color:'#fff',textAlign:'center',fontSize:24,letterSpacing:8,marginBottom:8},signalFlash:{position:'absolute',top:70,alignSelf:'center',alignItems:'center',zIndex:20},signalOrbit:{width:78,height:78,borderRadius:39,borderWidth:2,borderColor:'#9b7cff',backgroundColor:'rgba(22,28,65,0.94)',alignItems:'center',justifyContent:'center',shadowColor:'#9b7cff',shadowOpacity:0.8,shadowRadius:20,elevation:12},signalGlyph:{color:'#fff',fontSize:38},signalText:{color:'#fff',fontSize:14,marginTop:7,backgroundColor:'rgba(8,18,42,0.86)',paddingHorizontal:12,paddingVertical:6,borderRadius:16},btBrand:{alignItems:'center',marginTop:2,marginBottom:2},btHeroImage:{width:92,height:92,resizeMode:'contain'},btBrandName:{color:'#fff',fontSize:25,fontWeight:'700',letterSpacing:2},btBrandSub:{color:'#a9b3d4',fontSize:12,marginTop:1},btCore:{alignItems:'center',justifyContent:'center',height:300},btRing:{width:190,height:190,borderRadius:95,borderWidth:2,borderColor:'#6e80ff',alignItems:'center',justifyContent:'center',shadowColor:'#6e80ff',shadowOpacity:0.6,shadowRadius:30,elevation:12},btAnimRingA:{position:'absolute',width:148,height:148,borderRadius:74,borderWidth:2,borderColor:'rgba(83,235,255,0.7)',transform:[{rotate:'18deg'}]},btAnimRingB:{position:'absolute',width:118,height:118,borderRadius:59,borderWidth:2,borderColor:'rgba(214,132,255,0.72)',transform:[{rotate:'-34deg'}]},btGlyphOrbit:{width:96,height:96,borderRadius:48,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(9,18,42,0.45)',borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},btConnected:{borderColor:'#59e6a4',shadowColor:'#59e6a4'},btGlyph:{color:'#fff',fontSize:64},btState:{color:'#fff',fontSize:16,textAlign:'center',marginTop:22},powerCosmicPress:{alignItems:'center',justifyContent:'center',marginVertical:2},powerCosmicButton:{width:126,height:126,borderRadius:63,alignItems:'center',justifyContent:'center',borderWidth:2,backgroundColor:'rgba(8,16,38,0.82)',shadowOpacity:0.65,shadowRadius:28,elevation:14,overflow:'hidden'},powerCosmicOn:{borderColor:'rgba(91,255,195,0.78)',shadowColor:'#5bffc3'},powerCosmicOff:{borderColor:'rgba(255,105,190,0.72)',shadowColor:'#ff69be'},powerCosmicIcon:{width:100,height:100,resizeMode:'contain'},powerCosmicPulse:{position:'absolute',width:86,height:86,borderRadius:43,borderWidth:1,borderColor:'rgba(255,255,255,0.16)'},powerCosmicState:{position:'absolute',bottom:8,color:'#fff',fontSize:10,letterSpacing:2,textShadowColor:'#8b7dff',textShadowRadius:8},btConnectionModes:{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:4},btWirelessMini:{alignItems:'center',marginTop:8,marginBottom:2},wifiMiniPress:{alignItems:'center',justifyContent:'center'},wifiMiniOrb:{width:92,height:92,borderRadius:46,borderWidth:1.5,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,18,42,0.82)',shadowOpacity:0.55,shadowRadius:18,elevation:8},wifiMiniOrbit:{position:'absolute',width:78,height:78,borderRadius:39,borderWidth:1},wifiMiniGlyph:{color:'#eaf4ff',fontSize:27,textShadowColor:'#79e8ff',textShadowRadius:10},wifiMiniState:{fontSize:9,marginTop:3,fontWeight:'700'},wifiMiniHint:{color:'#7f8bad',fontSize:10,marginTop:3,textAlign:'center'},wifiPortalRow:{flexDirection:'row',alignItems:'center',gap:14},wifiPortalPress:{alignItems:'center',justifyContent:'center'},wifiPortalOrb:{width:108,height:108,borderRadius:54,borderWidth:1.5,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,18,42,0.82)',shadowOpacity:0.55,shadowRadius:20,elevation:9},wifiPortalOrbit:{position:'absolute',width:92,height:92,borderRadius:46,borderWidth:1},wifiPortalGlyph:{color:'#eef6ff',fontSize:34,textShadowColor:'#79e8ff',textShadowRadius:12},wifiPortalState:{fontSize:10,fontWeight:'700',marginTop:4},wifiPortalText:{flex:1},wifiPortalTitle:{color:'#fff',fontSize:17,fontWeight:'700',textAlign:'right'},btPowerZone:{alignItems:'center',marginTop:-18,marginBottom:4},cosmicTabs:{flexDirection:'row',justifyContent:'space-around',marginBottom:8},cosmicTab:{flex:1,alignItems:'center',paddingVertical:9,marginHorizontal:3,borderRadius:18,borderWidth:1,borderColor:'#293761',backgroundColor:'rgba(10,20,45,0.62)'},cosmicTabActive:{borderColor:'#b38cff',backgroundColor:'rgba(55,43,105,0.62)',shadowColor:'#a984ff',shadowOpacity:0.45,shadowRadius:12},cosmicTabShape0:{borderTopLeftRadius:26,borderBottomRightRadius:10},cosmicTabShape1:{borderRadius:18},cosmicTabShape2:{borderTopRightRadius:26,borderBottomLeftRadius:10},cosmicTabGlyph:{color:'#dfe4ff',fontSize:22},cosmicTabText:{color:'#c7d0ee',fontSize:11,marginTop:2},lightCore:{alignItems:'center',justifyContent:'center',paddingVertical:12},lightOrb:{width:126,height:126,borderRadius:69,borderWidth:2,backgroundColor:'#27316b',alignItems:'center',justifyContent:'center',shadowOpacity:0.65,shadowRadius:26,elevation:12},lightOrbGlyph:{color:'#fff',fontSize:48},sliderLabel:{color:'#dce2f7',fontSize:13,textAlign:'right',marginTop:10},sliderTrack:{height:18,borderRadius:9,backgroundColor:'#1b2850',borderWidth:1,borderColor:'#3b4c82',overflow:'hidden',justifyContent:'center',marginTop:6},sliderFill:{height:'100%',backgroundColor:'#8178ff',borderRadius:9},sliderDots:{position:'absolute',left:0,right:0,top:0,bottom:0,flexDirection:'row',justifyContent:'space-around',alignItems:'center'},sliderKnob:{position:'absolute',top:-2,width:22,height:22,marginLeft:-11,borderRadius:11,backgroundColor:'#fff',borderWidth:3,borderColor:'#b18cff',shadowColor:'#a784ff',shadowOpacity:0.8,shadowRadius:10,elevation:5},eqCosmicHero:{alignItems:'center',paddingVertical:14},eqHaloOuter:{width:170,height:170,borderRadius:85,borderWidth:1,borderColor:'rgba(83,235,255,0.45)',alignItems:'center',justifyContent:'center'},eqHaloInner:{position:'absolute',width:112,height:112,borderRadius:56,borderWidth:2,borderColor:'#b18cff',backgroundColor:'rgba(12,23,52,0.75)',alignItems:'center',justifyContent:'center',shadowColor:'#8c7dff',shadowOpacity:0.7,shadowRadius:24,elevation:12},eqPresetGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center'},eqSliderCard:{marginVertical:7,padding:14,borderRadius:24,borderWidth:1,borderColor:'rgba(120,140,230,0.28)',backgroundColor:'rgba(9,18,42,0.70)'},eqSliderHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sensorGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',paddingVertical:18},sliderDot:{width:10,height:10,borderRadius:5,backgroundColor:'#dfe5ff',opacity:0.7},colorOrb:{width:170,height:170,borderRadius:85,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#fff',shadowColor:'#fff',shadowOpacity:0.45,shadowRadius:25,elevation:10},rgbPortal:{width:176,height:176,borderRadius:95,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:2,backgroundColor:'rgba(8,12,34,0.90)',shadowOpacity:0.8,shadowRadius:28,elevation:14,overflow:'hidden'},rgbPortalRing:{position:'absolute',width:174,height:174,borderRadius:87,borderWidth:2,borderColor:'rgba(255,255,255,0.18)',alignItems:'center',justifyContent:'center'},rgbPortalSegment:{position:'absolute',width:16,height:42,borderRadius:9,shadowOpacity:0.75,shadowRadius:8,elevation:4},rgbPortalInner:{width:104,height:104,borderRadius:52,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,15,38,0.68)',borderWidth:1,borderColor:'rgba(255,255,255,0.34)'},rgbPortalCore:{width:42,height:42,borderRadius:21,shadowOpacity:0.95,shadowRadius:18,elevation:9,borderWidth:2,borderColor:'rgba(255,255,255,0.65)'},rgbPortalHex:{color:'#fff',fontSize:11,fontWeight:'800',marginTop:6},rgbPortalText:{color:'#dce5ff',fontSize:9,marginTop:2},rgbPortalMarker:{position:'absolute',width:18,height:18,borderRadius:9,borderWidth:2,backgroundColor:'rgba(255,255,255,0.18)'},galaxyPortal:{width:176,height:176,borderRadius:95,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:1,backgroundColor:'rgba(11,5,34,0.96)',shadowOpacity:0.85,shadowRadius:30,elevation:16,overflow:'hidden'},galaxyPortalOrbit:{position:'absolute',width:166,height:72,borderRadius:90,borderWidth:1,borderColor:'rgba(125,111,255,0.75)',transform:[{rotate:'24deg'}]},galaxyPortalOrbit2:{position:'absolute',width:132,height:48,borderRadius:70,borderWidth:1,borderColor:'rgba(255,112,211,0.58)',transform:[{rotate:'-36deg'}]},galaxyStar:{position:'absolute',width:5,height:5,borderRadius:3,shadowOpacity:0.9,shadowRadius:8,elevation:4},galaxyPortalInner:{width:108,height:108,borderRadius:54,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(12,7,40,0.72)',borderWidth:1,borderColor:'rgba(222,204,255,0.30)'},galaxyPortalCore:{width:48,height:48,borderRadius:24,shadowOpacity:1,shadowRadius:24,elevation:10,borderWidth:1,borderColor:'rgba(255,255,255,0.65)'},galaxyPortalHex:{color:'#fff',fontSize:11,fontWeight:'800',marginTop:6},galaxyPortalText:{color:'#dcd3ff',fontSize:9,marginTop:2},galaxyPortalMarker:{position:'absolute',width:16,height:16,borderRadius:8,borderWidth:2,backgroundColor:'rgba(255,255,255,0.12)'},colorOrbInner:{width:92,height:92,borderRadius:46,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,18,42,0.28)',borderWidth:1,borderColor:'rgba(255,255,255,0.45)'},colorOrbText:{color:'#fff',fontSize:13,fontWeight:'700',textShadowColor:'#17224a',textShadowRadius:8},colorDots:{flexDirection:'row',justifyContent:'center',marginTop:14},colorDot:{width:30,height:30,borderRadius:15,borderWidth:2,marginHorizontal:5},effectGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center'},effectTile:{width:62,height:62,borderRadius:31,borderWidth:1,borderColor:'#344579',backgroundColor:'#101c3b',alignItems:'center',justifyContent:'center',margin:5,shadowColor:'#7588ff',shadowOpacity:0.22,shadowRadius:10,elevation:4},effectTileActive:{borderColor:'#d1a5ff',backgroundColor:'#30235b',shadowOpacity:0.65},effectGlyph:{color:'#fff',fontSize:26},effectIndex:{color:'#8793b5',fontSize:9,position:'absolute',bottom:7},personalityRing:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',marginTop:8},personalityChip:{minWidth:76,paddingVertical:8,paddingHorizontal:7,borderRadius:18,borderWidth:1,borderColor:'#293761',backgroundColor:'#0d1830',alignItems:'center',margin:3},personalityChipActive:{borderColor:'#a784ff',backgroundColor:'#1a2149'},personalityGlyph:{color:'#cbd5ff',fontSize:18},eqStyleSwitch:{flexDirection:'row',justifyContent:'space-around',marginBottom:10},eqVisualSpectrum:{alignItems:'center',paddingVertical:12},eqSpectrumHalo:{width:188,height:188,borderRadius:94,borderWidth:2,borderColor:'rgba(100,245,255,0.45)',alignItems:'center',justifyContent:'center',shadowColor:'#64f5ff',shadowOpacity:0.45,shadowRadius:24,elevation:12},eqSpectrumCore:{width:116,height:116,borderRadius:58,borderWidth:2,borderColor:'#a78bff',backgroundColor:'rgba(10,22,48,0.86)',alignItems:'center',justifyContent:'center',shadowColor:'#a78bff',shadowOpacity:0.7,shadowRadius:18,elevation:10},eqSpectrumValue:{color:'#fff',fontSize:15,fontWeight:'700',marginTop:-8},eqSpectrumRays:{height:74,flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:5,marginTop:-12},eqSpectrumRay:{width:7,borderRadius:5,shadowOpacity:0.75,shadowRadius:8,elevation:4},eqBarsVisual:{height:235,flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:8,paddingHorizontal:14,paddingBottom:20},eqLiveBar:{width:17,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,0.25)',shadowOpacity:0.75,shadowRadius:10,elevation:5,overflow:'hidden'},eqLiveBarGlow:{position:'absolute',top:7,left:3,right:3,height:9,borderRadius:5,backgroundColor:'rgba(255,255,255,0.65)'},eqCore:{alignItems:'center',paddingVertical:20},eqGlyph:{color:'#d7d9ff',fontSize:58,textShadowColor:'#8178ff',textShadowRadius:18},eqCore:{alignItems:'center',paddingVertical:20},eqGlyph:{color:'#d7d9ff',fontSize:58,textShadowColor:'#8178ff',textShadowRadius:18},eqTitle:{color:'#fff',fontSize:20,fontWeight:'700'},eqBars:{marginTop:18,padding:12,borderRadius:24,borderWidth:1,borderColor:'#344579',backgroundColor:'rgba(9,19,43,0.72)'},eqCol:{marginVertical:8},eqGlyphSmall:{color:'#a993ff',fontSize:22,textAlign:'center'},eqLabel:{color:'#dce2f7',fontSize:12,textAlign:'center'},  eqColumnsVisual:{height:250,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-evenly',paddingHorizontal:16,paddingTop:12,paddingBottom:10},eqColumnsSpectrum:{backgroundColor:'rgba(8,18,42,0.32)',borderRadius:28,borderWidth:1,borderColor:'rgba(100,120,220,0.18)'},eqColumnWrap:{height:230,width:78,alignItems:'center',justifyContent:'flex-end'},eqVerticalLabel:{color:'#eef1ff',fontSize:13,fontWeight:'700',marginBottom:7},eqVerticalTrack:{width:34,height:190,borderRadius:17,borderWidth:1,borderColor:'rgba(180,190,255,0.28)',backgroundColor:'rgba(8,17,40,0.78)',overflow:'hidden',justifyContent:'flex-end'},eqVerticalFill:{position:'absolute',left:0,right:0,bottom:0,borderRadius:17,shadowOpacity:0.65,shadowRadius:14,elevation:7},eqVerticalGlow:{position:'absolute',left:6,right:6,height:5,borderRadius:5,shadowOpacity:0.85,shadowRadius:10,elevation:5},eqVerticalValue:{position:'absolute',left:4,right:4,height:12,borderWidth:1,borderRadius:7,backgroundColor:'rgba(255,255,255,0.18)',marginBottom:-6},eqVerticalPercent:{fontSize:11,fontWeight:'700',marginTop:7},  cameraScreen:{flex:1,backgroundColor:'#07152e'},cameraView:{flex:1},cameraOverlay:{position:'absolute',left:16,right:16,top:38,bottom:24,alignItems:'center',justifyContent:'space-between'},cameraTopPanel:{width:'100%',padding:12,borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,0.20)',backgroundColor:'rgba(5,12,30,0.58)',alignItems:'center'},cameraCenterBadge:{minWidth:150,paddingVertical:14,paddingHorizontal:22,borderRadius:28,borderWidth:1,borderColor:'rgba(155,125,255,0.35)',backgroundColor:'rgba(5,12,30,0.45)',alignItems:'center'},cameraBottomPanel:{width:'100%',padding:12,borderRadius:22,borderWidth:1,borderColor:'rgba(255,255,255,0.18)',backgroundColor:'rgba(5,12,30,0.62)'},cameraTitle:{color:'#fff',fontSize:24,fontWeight:'700',textShadowColor:'#17224a',textShadowRadius:8},cameraTimer:{color:'#fff',fontSize:38,fontWeight:'700',textShadowColor:'#17224a',textShadowRadius:10},cameraHint:{color:'#eef1ff',fontSize:14,textShadowColor:'#17224a',textShadowRadius:8},
  buttonDepthLine:{position:'absolute',bottom:0,left:'16%',right:'16%',height:2,borderRadius:99,opacity:0.8},
  cosmicTabPress:{flex:1,marginHorizontal:3},cosmicTabShell:{minHeight:66,borderWidth:1,borderRadius:22,alignItems:'center',justifyContent:'center',overflow:'hidden',backgroundColor:'rgba(8,14,32,0.62)',shadowOpacity:0.42,shadowRadius:16,elevation:8},cosmicTabOrbit:{position:'absolute',width:76,height:28,borderRadius:50,borderWidth:1,opacity:0.65,transform:[{rotate:'-18deg'}]},
  playlistCosmic:{minHeight:60,marginVertical:5,borderWidth:1,borderRadius:20,paddingHorizontal:10,flexDirection:'row',alignItems:'center',shadowOpacity:0.26,shadowRadius:12,elevation:5},playlistIndex:{width:38,height:38,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center',marginRight:9},playlistIndexText:{fontSize:10,fontWeight:'800'},playlistTitle:{color:'#c8d0e8',fontSize:13,flex:1},playlistMark:{fontSize:18,marginLeft:8},
  aiActionButton:{width:66,height:66,borderRadius:22,borderWidth:1,backgroundColor:'rgba(8,25,23,0.90)',alignItems:'center',justifyContent:'center',shadowOpacity:0.55,shadowRadius:18,elevation:10},aiActionOrbit:{position:'absolute',width:50,height:28,borderRadius:50,borderWidth:1,transform:[{rotate:'-20deg'}]},aiActionGlyph:{fontSize:27,fontWeight:'800'},aiActionMicro:{position:'absolute',bottom:5,color:'#eefbf7',fontSize:8,letterSpacing:1},
  talkCosmicButton:{width:176,height:102,borderWidth:1,borderRadius:50,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(7,29,28,0.84)',shadowOpacity:0.56,shadowRadius:25,elevation:12},talkLabel:{position:'absolute',bottom:7,color:'#e9fff7',fontSize:9,letterSpacing:1},
  aiChoice:{minWidth:78,minHeight:66,borderWidth:1,borderRadius:22,alignItems:'center',justifyContent:'center',margin:3,paddingHorizontal:8,shadowOpacity:0.26,shadowRadius:12,elevation:6},aiChoiceOrbit:{position:'absolute',width:58,height:28,borderWidth:1,borderRadius:40,transform:[{rotate:'18deg'}],opacity:0.5},aiChoiceGlyph:{fontSize:20,fontWeight:'800',marginBottom:2},
  colorCosmicChip:{width:40,height:40,borderRadius:14,borderWidth:2,marginHorizontal:4,alignItems:'center',justifyContent:'center',shadowOpacity:0.55,shadowRadius:12,elevation:6},colorChipInner:{width:25,height:25,borderRadius:9,borderWidth:1,borderColor:'rgba(255,255,255,0.55)'},colorChipIndex:{position:'absolute',right:3,top:2,color:'#0b1025',fontSize:7,fontWeight:'800'},
  effectCosmicTile:{width:62,height:62,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center',margin:4,shadowOpacity:0.35,shadowRadius:11,elevation:5,overflow:'hidden'},effectOrbitHalo:{position:'absolute',width:46,height:20,borderRadius:40,borderWidth:1,transform:[{rotate:'-28deg'}],opacity:0.58},
  powerCosmicOrbitA:{position:'absolute',width:122,height:50,borderRadius:90,borderWidth:1,opacity:0.8,transform:[{rotate:'18deg'}]},powerCosmicOrbitB:{position:'absolute',width:104,height:42,borderRadius:80,borderWidth:1,opacity:0.72,transform:[{rotate:'-40deg'}]},powerCosmicIconSmall:{width:68,height:68,resizeMode:'contain'},powerCosmicCore:{position:'absolute',width:28,height:28,borderRadius:14,opacity:0.18,shadowOpacity:0.9,shadowRadius:16},
});

