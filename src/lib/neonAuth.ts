import { createInternalNeonAuth } from '@neon/neon-js/auth';
import { BetterAuthReactAdapter } from '@neon/neon-js/auth/react/adapters';

const buildNeonClient = (url: string) =>
  createInternalNeonAuth(url, {
    adapter: BetterAuthReactAdapter(),
  });

type InternalNeonAuthInstance = ReturnType<typeof buildNeonClient>;

let runtimeAuthUrl: string = (import.meta.env?.VITE_NEON_AUTH_URL || '').trim().replace(/\/+$/, '');
let authInstance: InternalNeonAuthInstance | null = null;

export function configureNeonAuthUrl(url?: string | null) {
  const normalized = (url || '').trim().replace(/\/+$/, '');
  if (normalized && normalized !== runtimeAuthUrl) {
    runtimeAuthUrl = normalized;
    authInstance = null;
  }
}

export function getNeonAuthUrl(): string {
  return runtimeAuthUrl;
}

export function isNeonAuthConfigured(): boolean {
  return Boolean(runtimeAuthUrl);
}

export function getNeonAuth(): InternalNeonAuthInstance | null {
  if (!runtimeAuthUrl) return null;
  if (!authInstance) {
    authInstance = buildNeonClient(runtimeAuthUrl);
  }
  return authInstance;
}

export async function getNeonJwtToken(): Promise<string | null> {
  const client = getNeonAuth();
  if (!client) return null;
  try {
    return await client.getJWTToken();
  } catch {
    return null;
  }
}

export async function neonSignIn(email: string, password: string) {
  const client = getNeonAuth();
  if (!client) throw new Error('Neon Auth URL is not configured (VITE_NEON_AUTH_URL).');
  const res = await client.adapter.signIn.email({
    email: email.trim(),
    password,
  });
  if ((res as any)?.error) {
    throw new Error((res as any).error.message || 'Sign-in failed.');
  }
  return res;
}

export async function neonSignUp(name: string, email: string, password: string) {
  const client = getNeonAuth();
  if (!client) throw new Error('Neon Auth URL is not configured (VITE_NEON_AUTH_URL).');
  const res = await client.adapter.signUp.email({
    name: name.trim(),
    email: email.trim(),
    password,
  });
  if ((res as any)?.error) {
    throw new Error((res as any).error.message || 'Registration failed.');
  }
  return res;
}

export async function neonRequestPasswordReset(email: string, redirectTo: string) {
  const client = getNeonAuth();
  if (!client) throw new Error('Neon Auth URL is not configured (VITE_NEON_AUTH_URL).');
  const adapter = client.adapter as any;
  const fn = adapter.requestPasswordReset || adapter.forgetPassword;
  if (typeof fn !== 'function') {
    throw new Error('Password reset endpoint is not supported by this Neon Auth client.');
  }
  const res = await fn({ email: email.trim(), redirectTo });
  if (res?.error) {
    throw new Error(res.error.message || 'Failed to send reset link.');
  }
  return res;
}

export async function neonResetPassword(newPassword: string, token: string) {
  const client = getNeonAuth();
  if (!client) throw new Error('Neon Auth URL is not configured (VITE_NEON_AUTH_URL).');
  const res = await (client.adapter as any).resetPassword({
    newPassword,
    token,
  });
  if (res?.error) {
    throw new Error(res.error.message || 'Failed to update password.');
  }
  return res;
}

export async function neonSignOut() {
  const client = getNeonAuth();
  if (!client) return;
  try {
    await client.adapter.signOut();
  } catch {
    // Ignore errors during sign-out cleanup
  }
}
