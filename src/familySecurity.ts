import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Family-wide security API client for Korosh Nova.
 * No credentials, SMTP secrets, or database credentials belong in the Android app.
 * Parent sessions remain in memory; enrolled-device tokens are stored in Android Keystore.
 */
const FAMILY_API_URL = String(process.env.EXPO_PUBLIC_KOROSH_NOVA_FAMILY_SECURITY_URL || '')
  .trim()
  .replace(/\/+$/, '');
const DEVICE_ID_KEY = 'korosh_nova_family_security_device_v1';
const DEVICE_TOKEN_KEY = 'korosh_nova_family_device_token_v1';

export type FamilyRole = 'father' | 'mother';
export type FamilyAuthMethod = 'pin' | 'pattern' | 'biometric';
export type SecurityTargets = Record<string, boolean>;
export type FamilySecuritySnapshot = {
  configured: boolean;
  familyName: string;
  primaryOwnerRole: FamilyRole | null;
  currentRole: FamilyRole | null;
  currentName: string | null;
  parentAdmins: Array<{ role: FamilyRole; name: string; emailMasked: string; isPrimary: boolean }>;
  authMethod: FamilyAuthMethod;
  biometricAllowed: boolean;
  hasCredential: boolean;
  options: SecurityTargets;
  policyVersion: number;
  updatedAt?: string | null;
};
export type FamilyDevice = {
  deviceId: string;
  deviceName: string;
  role: 'admin' | 'member';
  createdAt: string;
  lastSeenAt: string | null;
  createdBy: string;
};

export const FAMILY_SECURITY_CONFIGURED = Boolean(FAMILY_API_URL);

export class FamilySecurityError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'unknown', status = 0) {
    super(message);
    this.name = 'FamilySecurityError';
    this.code = code;
    this.status = status;
  }
}

async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
  if (!FAMILY_API_URL) throw new FamilySecurityError('Family Security API is not configured.', 'service_unconfigured');
  const url = `${FAMILY_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) {
    throw new FamilySecurityError('Family Security API must use HTTPS.', 'https_required');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
        signal: controller.signal,
      });
    } catch (error: any) {
      throw new FamilySecurityError(
        error?.name === 'AbortError' ? 'پاسخ سرویس امنیت خانواده دیر رسید.' : 'سرویس امنیت خانواده در دسترس نیست؛ اتصال و نشانی سرویس را بررسی کن.',
        error?.name === 'AbortError' ? 'timeout' : 'network_unavailable',
      );
    }
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new FamilySecurityError(
        String(data?.message || 'درخواست امنیت خانواده انجام نشد.'),
        String(data?.code || 'request_failed'),
        response.status,
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function createOrGetDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY).catch(() => null);
  if (!id) {
    const bytes = await Crypto.getRandomBytesAsync(24);
    id = Array.from(bytes, (v: number) => v.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  }
  return id;
}

export async function getFamilyDeviceToken(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_TOKEN_KEY).catch(() => null);
}
export async function saveFamilyDeviceToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}
export async function clearFamilyDeviceToken(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY).catch(() => {});
}
export async function clearFamilyDeviceEnrollment(): Promise<void> {
  await clearFamilyDeviceToken();
}

export function checkFamilyService() {
  return api<{ ok: boolean; configured: boolean; version: string; familyName?: string; hasCredential?: boolean }>('/v1/health', { timeoutMs: 12000 });
}
export function requestFamilyEmailCode(email: string) {
  return api<{ ok: boolean; message: string }>('/v1/auth/request-code', { method: 'POST', body: { email: email.trim().toLowerCase() } });
}
export async function verifyFamilyEmailCode(email: string, code: string) {
  return api<{ token: string; expiresAt: string; profile: { role: FamilyRole; name: string; isPrimary: boolean }; policyVersion: number }>('/v1/auth/verify-code', {
    method: 'POST', body: { email: email.trim().toLowerCase(), code: code.trim() },
  });
}
export async function registerAdminDevice(parentToken: string) {
  const deviceId = await createOrGetDeviceId();
  const result = await api<{ ok: boolean; deviceToken: string; deviceId: string }>('/v1/family/devices/admin-register', {
    method: 'POST', token: parentToken, body: { deviceId, deviceName: 'گوشی مدیر کوروش نوا' },
  });
  await saveFamilyDeviceToken(result.deviceToken);
  return result;
}
export async function enrollFamilyDevice(pairCode: string) {
  const deviceId = await createOrGetDeviceId();
  const result = await api<{ ok: boolean; deviceToken: string; deviceId: string; policy: FamilySecuritySnapshot }>('/v1/family/devices/enroll', {
    method: 'POST', body: { pairCode: pairCode.trim(), deviceId, deviceName: 'گوشی خانواده کوروش نوا' },
  });
  await saveFamilyDeviceToken(result.deviceToken);
  return result;
}
export function createFamilyPairCode(parentToken: string) {
  return api<{ ok: boolean; pairCode: string; expiresAt: string }>('/v1/family/devices/pair-code', { method: 'POST', token: parentToken, body: {} });
}
export function fetchFamilyDevices(parentToken: string) {
  return api<{ devices: FamilyDevice[] }>('/v1/family/devices', { token: parentToken });
}
export function revokeFamilyDevice(parentToken: string, deviceId: string) {
  return api<{ ok: boolean }>('/v1/family/devices/revoke', { method: 'POST', token: parentToken, body: { deviceId } });
}
export function fetchFamilySecurity(parentToken: string) {
  return api<FamilySecuritySnapshot>('/v1/family/security', { token: parentToken });
}
export async function fetchFamilyDevicePolicy(deviceToken?: string | null) {
  const token = deviceToken || await getFamilyDeviceToken();
  if (!token) throw new FamilySecurityError('این گوشی هنوز به خانواده متصل نشده است.', 'device_not_enrolled', 401);
  return api<FamilySecuritySnapshot>('/v1/family/security/device-policy', { token });
}
export function saveFamilySecurityPolicy(token: string, input: { authMethod: FamilyAuthMethod; biometricAllowed: boolean; options: SecurityTargets; expectedPolicyVersion: number }) {
  return api<FamilySecuritySnapshot>('/v1/family/security/policy', { method: 'PUT', token, body: input });
}
export function saveFamilyCredential(token: string, input: { method: FamilyAuthMethod; pin: string; pattern?: string; currentPin?: string; expectedPolicyVersion: number }) {
  return api<{ ok: boolean; hasCredential: boolean; authMethod: FamilyAuthMethod; biometricAllowed: boolean; recoveryCode: string; policyVersion: number }>('/v1/family/security/credential', { method: 'PUT', token, body: input });
}
export async function verifyFamilyCredential(kind: 'pin' | 'pattern', value: string): Promise<boolean> {
  const deviceToken = await getFamilyDeviceToken();
  if (!deviceToken) throw new FamilySecurityError('این گوشی به خانواده متصل نشده است؛ والد باید کد اتصال بسازد.', 'device_not_enrolled', 401);
  const deviceId = await createOrGetDeviceId();
  const result = await api<{ verified: boolean }>('/v1/family/security/verify', {
    method: 'POST', token: deviceToken, body: { kind, value, deviceId }, timeoutMs: 10000,
  });
  return result.verified === true;
}
export async function verifyFamilyBiometricAllowed(): Promise<boolean> {
  const deviceToken = await getFamilyDeviceToken();
  if (!deviceToken) return false;
  const result = await api<{ allowed: boolean }>('/v1/family/security/verify-biometric', { method: 'POST', token: deviceToken, body: {} });
  return result.allowed === true;
}
export function recoverFamilyCredential(input: { email: string; otp: string; recoveryCode: string; newPin: string }) {
  return api<{ ok: boolean; recoveryCode: string; policyVersion: number }>('/v1/family/security/recover', {
    method: 'POST', body: { email: input.email.trim().toLowerCase(), otp: input.otp.trim(), recoveryCode: input.recoveryCode.trim(), newPin: input.newPin },
  });
}
