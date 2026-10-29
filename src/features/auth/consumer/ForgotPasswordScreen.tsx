import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { consumerAuthService } from '../../../services/consumerAuthService';
import { AkrLogo } from '../../../assets/logo';
import { GoldButton, InputField } from '../../../components/ui';

export const ForgotPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'identifier' | 'otp' | 'new_password' | 'success'>('identifier');
  const [identifier, setIdentifier] = useState('rahul@example.com');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your registered email, mobile, or account ID');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await consumerAuthService.forgotPassword(identifier);
      if (res.emailMasked) {
        setMaskedEmail(res.emailMasked);
      }
      setSuccessMsg(res.message || 'Verification code sent successfully');
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || 'Identifier not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await consumerAuthService.verifyOtp(otp, identifier, 'forgot_password');
      setStep('new_password');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await consumerAuthService.resetPassword(identifier, newPassword, otp);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-6 bg-akr-bg text-white">
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('/app/login')}
            className="w-9 h-9 rounded-full bg-akr-surface border border-akr-border text-white hover:text-akr-gold flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AkrLogo size="sm" variant="image" />
          <div className="w-9" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && step === 'otp' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'identifier' && (
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Reset Password
            </h1>
            <p className="text-xs text-akr-text-muted mt-1 mb-6">
              Enter your registered email address, mobile number, or Account ID to receive a verification OTP.
            </p>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <InputField
                label="Registered Email, Mobile or Account ID"
                placeholder="e.g. rahul@example.com or AKR10004821"
                icon={<Mail className="w-4 h-4" />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <div className="pt-2">
                <GoldButton type="submit" isLoading={isLoading}>
                  Send Verification Code
                </GoldButton>
              </div>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Enter Verification Code
            </h1>
            <p className="text-xs text-akr-text-muted mt-1 mb-4">
              We sent a 6-digit OTP code to{' '}
              <strong className="text-white">{maskedEmail || identifier}</strong> from{' '}
              <span className="text-akr-gold">creditsupportakr@gmail.com</span>.
            </p>

            <div className="p-3 rounded-xl bg-zinc-900 border border-akr-gold/30 text-xs text-zinc-300 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-akr-gold">
                <span>✉️</span> Check your inbox & spam folder
              </span>
              {resendTimer > 0 ? (
                <span className="text-[11px] text-zinc-500 font-mono">
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isLoading}
                  className="text-[11px] text-akr-gold hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Code
                </button>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <InputField
                label="6-Digit Verification Code"
                placeholder="e.g. 849201"
                maxLength={6}
                icon={<KeyRound className="w-4 h-4" />}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />

              <div className="pt-2">
                <GoldButton type="submit" isLoading={isLoading}>
                  Verify OTP
                </GoldButton>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('identifier')}
                  className="text-xs text-akr-text-muted hover:text-white"
                >
                  Change Email / Mobile Number
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'new_password' && (
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Set New Password
            </h1>
            <p className="text-xs text-akr-text-muted mt-1 mb-6">
              Create a strong password for your AKR Credit Capital account.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <InputField
                label="New Password"
                type="password"
                placeholder="Min 6 characters"
                icon={<Lock className="w-4 h-4" />}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <InputField
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter password"
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <div className="pt-2">
                <GoldButton type="submit" isLoading={isLoading}>
                  Update Password
                </GoldButton>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-serif font-bold text-white mb-2">Password Reset Successful</h2>
            <p className="text-xs text-akr-text-muted max-w-xs mx-auto mb-6">
              Your password has been securely updated. You can now sign in with your new credentials.
            </p>
            <GoldButton onClick={() => navigate('/app/login')}>
              Return to Sign In
            </GoldButton>
          </div>
        )}
      </div>

      <div className="text-center pt-6">
        <Link to="/app/login" className="text-xs text-akr-text-muted hover:text-akr-gold">
          Remember your password? Sign In
        </Link>
      </div>
    </div>
  );
};
