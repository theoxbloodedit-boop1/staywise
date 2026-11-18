import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle2, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { apiFetch, setActiveOrganizationId } from '../lib/api';
import {
  configureNeonAuthUrl,
  getNeonJwtToken,
  isNeonAuthConfigured,
  neonRequestPasswordReset,
  neonResetPassword,
  neonSignIn,
  neonSignOut,
  neonSendVerificationEmail,
  neonVerifyEmailCode,
  neonSignUp,
} from '../lib/neonAuth';
import { Button, Card, Input, Select } from '../components/ui';
import { REGION_PRESETS } from '../lib/format';
import { DEFAULT_PLAN_TIER, PLAN_LIST, parsePlanTier } from '../lib/plans';
import type { RegionCode, SessionContext } from '../lib/types';

export function AuthPage({
  initialMode = 'login',
  defaultPlan = DEFAULT_PLAN_TIER,
  onboardingUser = null,
  onBack,
  onNavigate,
  onSuccess,
  onSignedOut,
}: {
  initialMode?: 'register' | 'login' | 'forgot' | 'reset';
  defaultPlan?: string;
  onboardingUser?: { email: string; name: string } | null;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onSuccess: (session: SessionContext) => void;
  onSignedOut?: () => void;
}) {
  const [mode, setMode] = useState<'register' | 'login' | 'forgot' | 'reset' | 'onboard'>(
    onboardingUser ? 'onboard' : initialMode
  );
  const [neonReady, setNeonReady] = useState(() => isNeonAuthConfigured());

  const resolveInitialPlan = () => {
    if (typeof window !== 'undefined') {
      const fromUrl = parsePlanTier(new URLSearchParams(window.location.search).get('plan'));
      if (fromUrl) return fromUrl;
    }
    return parsePlanTier(defaultPlan) || DEFAULT_PLAN_TIER;
  };

  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState(onboardingUser?.name || '');
  const [email, setEmail] = useState(onboardingUser?.email || '');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<RegionCode>('US');
  const [planTier, setPlanTier] = useState<string>(resolveInitialPlan);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('token') || '';
    }
    return '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [invitationToken, setInvitationToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const parsed = parsePlanTier(defaultPlan);
    if (parsed) {
      setPlanTier(parsed);
    }
  }, [defaultPlan]);

  useEffect(() => {
    if (onboardingUser) {
      setMode('onboard');
      setOwnerName(onboardingUser.name);
      setEmail(onboardingUser.email);
    } else if (resetToken) {
      setMode('reset');
    }
  }, [onboardingUser, resetToken]);

  const [dbMissing, setDbMissing] = useState(false);

  useEffect(() => {
    // Allow backend env NEON_AUTH_BASE_URL to populate runtime URL if VITE_NEON_AUTH_URL was omitted
    apiFetch('/api/auth/context')
      .then((ctx) => {
        if (ctx?.neonAuthUrl) {
          configureNeonAuthUrl(ctx.neonAuthUrl);
          setNeonReady(true);
        }
      })
      .catch((err) => {
        if (err?.code === 'DATABASE_NOT_CONFIGURED') {
          setDbMissing(true);
        }
      });
  }, []);

  const completeWorkspaceProvisioning = async () => {
    const res = await apiFetch('/api/auth/onboard', {
      method: 'POST',
      body: JSON.stringify({
        orgName,
        ownerName,
        country,
        planTier,
        termsAccepted: acceptedLegal,
        privacyAccepted: acceptedLegal,
      }),
    });
    onSuccess({
      organizationId: res.organization.id,
      userId: res.user.id,
      actorName: res.user.name,
      actorRole: 'Organization Owner',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (mode === 'onboard') {
        if (!acceptedLegal) {
          throw new Error('Please accept the Terms of Service and Privacy Policy.');
        }
        await completeWorkspaceProvisioning();
        return;
      }

      if (!neonReady) {
        throw new Error(
          'Neon Auth is not configured yet. Set VITE_NEON_AUTH_URL and NEON_AUTH_BASE_URL in your environment variables.'
        );
      }

      if (mode === 'register') {
        const configuration = await apiFetch('/api/auth/configuration');
        if (!configuration.configured) {
          throw new Error('Sign-in is temporarily unavailable while the server is being configured. If you already registered, keep your account and try signing in again once setup is complete.');
        }
      }

      if (mode === 'register') {
        if (!acceptedLegal) {
          throw new Error('Please accept the Terms of Service and Privacy Policy.');
        }
        await neonSignUp(ownerName, email, password);

        const token = await getNeonJwtToken();
        if (!token) {
          setNotice(
            'Account created in Neon Auth. Please verify your email address, then sign in to create your STAYWISE workspace.'
          );
          setMode('login');
          return;
        }

        const ctx = await apiFetch('/api/auth/context');
        if (ctx.authenticated && !ctx.needsOnboarding && ctx.user) {
          onSuccess({
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            actorName: ctx.user.name,
            actorRole: ctx.user.role,
          });
        } else {
          await completeWorkspaceProvisioning();
        }
      } else if (mode === 'login') {
        // Establish the provider session first so diagnostics can inspect it.
        // This does not authenticate the user to the Staywise API.
        await neonSignIn(email, password);
        const configuration = await apiFetch('/api/auth/configuration');
        if (!configuration.configured) {
          throw new Error('Your Neon sign-in succeeded, but Staywise server setup is incomplete. Click Check sign-in setup below. Do not create another account.');
        }
        const ctx = await apiFetch('/api/auth/context');
        if (ctx.authenticated && !ctx.needsOnboarding && ctx.user) {
          onSuccess({
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            actorName: ctx.user.name,
            actorRole: ctx.user.role,
          });
        } else if (ctx.authenticated && ctx.needsOnboarding) {
          setOwnerName(ctx.neonUser?.name || '');
          setEmail(ctx.neonUser?.email || email);
          setMode('onboard');
        } else if (ctx.emailVerificationRequired) {
          throw new Error('Please verify your email address. Use the email verification code form below, then sign in again.');
        } else {
          throw new Error('Staywise could not validate this session. Use Check sign-in setup for details.');
        }
      } else if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}/auth`;
        await neonRequestPasswordReset(email, redirectTo);
        setNotice('If an account exists for that email, Neon Auth has sent a password reset link.');
      } else if (mode === 'reset') {
        await neonResetPassword(newPassword, resetToken);
        setNotice('Password updated via Neon Auth. You may now sign in.');
        setPassword('');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutClick = async () => {
    await neonSignOut();
    onSignedOut?.();
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Staywise
        </button>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-2.5 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                SW
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  {mode === 'onboard'
                    ? 'Set Up Your Workspace'
                    : mode === 'register'
                      ? 'Create Your Staywise Account'
                      : mode === 'login'
                        ? 'Welcome back'
                        : 'Password Recovery'}
                </h1>
                <p className="text-xs text-slate-500">
                  {mode === 'onboard'
                    ? `Signed in as ${email} — name your team workspace to begin`
                    : mode === 'register'
                      ? 'Start managing welcome books and turnovers in minutes'
                      : 'Sign in to your Staywise team workspace'}
                </p>
              </div>
            </div>
            {mode === 'onboard' && (
              <button
                type="button"
                onClick={handleSignOutClick}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {(dbMissing || !neonReady) && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <div className="font-semibold">Neon Configuration Required</div>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {dbMissing && (
                    <span>
                      Set <code className="font-mono">DATABASE_URL</code> (Neon PostgreSQL).{' '}
                    </span>
                  )}
                  {!neonReady && (
                    <span>
                      Set <code className="font-mono">VITE_NEON_AUTH_URL</code> and{' '}
                      <code className="font-mono">NEON_AUTH_BASE_URL</code> (Neon Auth) in your Vercel or{' '}
                      <code className="font-mono">.env</code> settings.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {(mode === 'register' || mode === 'login') && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setNotice('');
                }}
                className={`py-1.5 text-xs font-medium rounded ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setNotice('');
                }}
                className={`py-1.5 text-xs font-medium rounded ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                New Organization
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
              <button type="button" className="block mt-2 underline" disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await apiFetch('/api/auth/session-diagnostic', { method: 'POST' });
                    setNotice(`Sign-in setup diagnostic (does not grant access): ${JSON.stringify(result)}`);
                  } catch {
                    setNotice('The sign-in diagnostic is unavailable. No account changes were made.');
                  } finally { setLoading(false); }
                }}>
                Check sign-in setup
              </button>
            </div>
          )}

          {(mode === 'login' || mode === 'onboard') && (
            <div className="mb-4 text-xs text-slate-600">
              <button type="button" className="text-teal-800 underline disabled:opacity-50"
                disabled={loading || verificationRequested || !email.trim()}
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    await neonSendVerificationEmail(email);
                    setVerificationRequested(true);
                    setNotice('Verification code requested. If your account is eligible, check your inbox and spam folder, then enter the newest six-digit code below.');
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Verification could not be requested.');
                  } finally { setLoading(false); }
                }}>
                {verificationRequested ? 'Verification code requested' : 'Send email verification code'}
              </button>
              <p className="mt-1">Verify ownership of your email before accessing a workspace.</p>
              <label htmlFor="email-verification-code" className="block mt-3 mb-1">Email verification code (6 digits)</label>
              <input id="email-verification-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded border border-slate-300 p-2" />
              <button type="button" disabled={loading || !email.trim() || !/^\d{6}$/.test(emailCode)}
                className="mt-2 text-teal-800 underline disabled:opacity-50"
                onClick={async () => {
                  setLoading(true); setError(''); setNotice('');
                  try {
                    await neonVerifyEmailCode(email, emailCode);
                    setEmailCode('');
                    await neonSignOut();
                    setMode('login');
                    setNotice('Email verified by Neon. Sign in again to obtain a fresh session.');
                  } catch (err: unknown) {
                    setEmailCode('');
                    setVerificationRequested(false);
                    setError(err instanceof Error ? err.message : 'Email verification failed.');
                  } finally { setLoading(false); }
                }}>Verify email code</button>
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 rounded-md bg-teal-50 border border-teal-200 text-xs text-teal-900 break-words">
              {notice}
            </div>
          )}

          <form className="mb-5 space-y-2 border-b pb-4" onSubmit={async e => {
            e.preventDefault(); setLoading(true); setError('');
            try {
              const result = await apiFetch('/api/auth/invitations/accept', { method: 'POST', body: JSON.stringify({ token: invitationToken.trim() }) });
              setInvitationToken(''); setActiveOrganizationId(result.organization_id);
              const ctx = await apiFetch('/api/auth/context');
              if (!ctx.user) throw new Error('Invitation accepted. Reload and sign in again.');
              onSuccess({ organizationId: ctx.user.organizationId, userId: ctx.user.id, actorName: ctx.user.name, actorRole: ctx.user.role });
            } catch (err: any) { setError(err.message || 'Invitation could not be accepted. Sign in with a verified email first.'); }
            finally { setLoading(false); }
          }}>
            <Input label="Invitation token (sign in with a verified email first)" value={invitationToken} onChange={e => setInvitationToken(e.target.value)} autoComplete="off" />
            <Button type="submit" disabled={loading || !invitationToken.trim()}>Accept invitation</Button>
          </form>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {(mode === 'register' || mode === 'onboard') && (
              <>
                <Input
                  label="Company or Portfolio Name"
                  placeholder="e.g., Pacific Crest Stays"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Input
                  label="Owner Full Name"
                  placeholder="e.g., Jordan Taylor"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Primary Region"
                    value={country}
                    onChange={(e) => setCountry(e.target.value as RegionCode)}
                  >
                    {(Object.keys(REGION_PRESETS) as RegionCode[]).map((code) => (
                      <option key={code} value={code}>
                        {REGION_PRESETS[code].label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Workspace Capacity Tier (100% Free Full Access)"
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value)}
                  >
                    {PLAN_LIST.map((p) => (
                      <option key={p.tier} value={p.tier}>
                        {p.label} ({p.propertyLimit} units · $0 Free Full Access)
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}

            {(mode === 'register' || mode === 'login' || mode === 'forgot') && (
              <Input
                label="Work Email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            {(mode === 'register' || mode === 'login') && (
              <Input
                label={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
                type="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {(mode === 'register' || mode === 'onboard') && (
              <label className="flex items-start gap-2 text-xs text-slate-600 pt-1">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/terms')}
                    className="text-teal-700 font-medium hover:underline"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/privacy')}
                    className="text-teal-700 font-medium hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            )}

            {mode === 'reset' && (
              <>
                <Input
                  label="Reset Token"
                  required
                  placeholder="Paste reset token from email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
                <Input
                  label="New Password (min 8 characters)"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-500 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> Invited staff? Sign up with your invite email.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                  }}
                  className="text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Forgot?
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading
                ? 'Signing in...'
                : mode === 'onboard'
                  ? 'Create Workspace & Continue'
                  : mode === 'register'
                    ? 'Create Account & Workspace'
                    : mode === 'login'
                      ? 'Sign In'
                      : mode === 'forgot'
                        ? 'Send Reset Link'
                        : 'Update Password'}
            </Button>

            {(mode === 'forgot' || mode === 'reset') && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Back to Sign In
              </Button>
            )}
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            Encrypted session authentication · Door PINs & Wi-Fi stored with AES-256 encryption.
          </div>
        </Card>
      </div>
    </div>
  );
}
