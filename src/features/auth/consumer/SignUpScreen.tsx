import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import {
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LogIn,
  KeyRound,
  RefreshCw,
  X,
} from 'lucide-react';
import { consumerSignUpSchema, ConsumerSignUpFormData } from '../../../core/validation';
import { consumerAuthService } from '../../../services/consumerAuthService';
import { GoogleProfileInfo } from '../../../core/types';
import { AkrLogo } from '../../../assets/logo';
import { GoldButton, GoogleButton, InputField } from '../../../components/ui';

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [alreadyRegisteredError, setAlreadyRegisteredError] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<GoogleProfileInfo | null>(null);
  const [googleToken, setGoogleToken] = useState<{ accessToken?: string; credential?: string } | null>(null);

  // Email OTP state for standard signup
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [signUpOtp, setSignUpOtp] = useState('');
  const [pendingFormData, setPendingFormData] = useState<ConsumerSignUpFormData | null>(null);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
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

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ConsumerSignUpFormData>({
    resolver: zodResolver(consumerSignUpSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
      agreeTerms: false,
    },
  });

  const onSubmit = async (data: ConsumerSignUpFormData) => {
    try {
      setServerError(null);
      setAlreadyRegisteredError(false);

      if (googleProfile && googleToken) {
        // Sign up with Google + basic details (Google verified account bypasses email OTP)
        await consumerAuthService.registerWithGoogle({
          ...googleToken,
          fullName: data.fullName,
          mobile: data.mobile,
          email: googleProfile.email,
          password: data.password,
          address: data.address,
        });
        navigate('/app/home');
      } else {
        // Standard registration: send OTP to email before creating account
        setPendingFormData(data);
        await consumerAuthService.sendSignUpOtp({
          fullName: data.fullName,
          mobile: data.mobile,
          email: data.email,
        });
        setIsVerifyingOtp(true);
        setResendTimer(60);
      }
    } catch (err: any) {
      if (err.status === 409) {
        setAlreadyRegisteredError(true);
      }
      setServerError(err.message || 'Registration failed');
    }
  };

  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFormData) return;
    if (signUpOtp.trim().length !== 6) {
      setServerError('Please enter the 6-digit verification code');
      return;
    }

    try {
      setIsOtpSubmitting(true);
      setServerError(null);

      await consumerAuthService.verifySignUpAndCreate({
        fullName: pendingFormData.fullName,
        mobile: pendingFormData.mobile,
        email: pendingFormData.email,
        password: pendingFormData.password,
        address: pendingFormData.address,
        otp: signUpOtp.trim(),
      });

      navigate('/app/home');
    } catch (err: any) {
      setServerError(err.message || 'Invalid or expired verification code');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleResendSignUpOtp = async () => {
    if (!pendingFormData || resendTimer > 0) return;
    try {
      setIsOtpSubmitting(true);
      setServerError(null);
      await consumerAuthService.sendSignUpOtp({
        fullName: pendingFormData.fullName,
        mobile: pendingFormData.mobile,
        email: pendingFormData.email,
      });
      setResendTimer(60);
    } catch (err: any) {
      setServerError(err.message || 'Failed to resend verification code');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const googleSignUp = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsGoogleLoading(true);
        setServerError(null);
        setAlreadyRegisteredError(false);

        const checkRes = await consumerAuthService.checkGoogleAccount({
          accessToken: tokenResponse.access_token,
        });

        if (checkRes.exists || !checkRes.isNewUser) {
          // Account already exists - do not allow re-signup
          setAlreadyRegisteredError(true);
          setServerError(
            checkRes.message ||
              'An account with this Google email already exists. Please log in directly.'
          );
          return;
        }

        // New Google account detected!
        // Pre-fill user details and prompt for mobile, password, and basic info
        setGoogleProfile(checkRes.googleProfile);
        setGoogleToken({ accessToken: tokenResponse.access_token });
        setValue('fullName', checkRes.googleProfile.name || '', { shouldValidate: true });
        setValue('email', checkRes.googleProfile.email || '', { shouldValidate: true });
      } catch (err: any) {
        setServerError(err.message || 'Failed to verify Google account');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (error) => {
      console.warn('Google Sign-Up canceled or failed:', error);
      setIsGoogleLoading(false);
    },
  });

  const handleDisconnectGoogle = () => {
    setGoogleProfile(null);
    setGoogleToken(null);
    setValue('email', '');
    setValue('fullName', '');
    setServerError(null);
    setAlreadyRegisteredError(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-6 bg-akr-bg text-white relative overflow-y-auto">
      <div>
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              if (isVerifyingOtp) {
                setIsVerifyingOtp(false);
                setSignUpOtp('');
              } else {
                navigate('/app/login');
              }
            }}
            className="w-9 h-9 rounded-full bg-akr-surface border border-akr-border text-white hover:text-akr-gold flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AkrLogo size="sm" variant="image" />
          <div className="w-9" />
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex flex-col gap-2 text-xs text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
            {alreadyRegisteredError && (
              <button
                type="button"
                onClick={() => navigate('/app/login')}
                className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-akr-gold text-black font-semibold text-xs hover:bg-akr-gold-light transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Go to Sign In
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Email OTP Verification Screen */}
        {isVerifyingOtp && pendingFormData ? (
          <div>
            <div className="mb-5 text-left">
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Verify Your Email
              </h1>
              <p className="text-xs text-akr-text-muted mt-1 leading-relaxed">
                We sent a 6-digit verification code to{' '}
                <strong className="text-white">{pendingFormData.email}</strong> from{' '}
                <span className="text-akr-gold">creditsupportakr@gmail.com</span>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-akr-gold/30 text-xs text-zinc-300 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-akr-gold">
                <span>✉️</span> Check your inbox & spam
              </span>
              {resendTimer > 0 ? (
                <span className="text-[11px] text-zinc-500 font-mono">
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendSignUpOtp}
                  disabled={isOtpSubmitting}
                  className="text-[11px] text-akr-gold hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Code
                </button>
              )}
            </div>

            <form onSubmit={handleVerifySignUpOtp} className="space-y-4">
              <InputField
                label="6-Digit Verification Code"
                placeholder="e.g. 592814"
                maxLength={6}
                icon={<KeyRound className="w-4 h-4" />}
                value={signUpOtp}
                onChange={(e) => setSignUpOtp(e.target.value)}
              />

              <div className="pt-2">
                <GoldButton type="submit" isLoading={isOtpSubmitting}>
                  Verify & Create Account
                </GoldButton>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyingOtp(false)}
                  className="text-xs text-akr-text-muted hover:text-white"
                >
                  Edit Registration Details / Change Email
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 1: Registration Form */
          <div>
            <div className="mb-5 text-left">
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Create Account
              </h1>
              <p className="text-xs text-akr-text-muted mt-1">
                Join AKR Credit Capital and streamline your EMI & dues management.
              </p>
            </div>

            {/* Google Status / Quick Sign-Up */}
            {googleProfile ? (
              <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-akr-gold/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {googleProfile.avatarUrl ? (
                    <img
                      src={googleProfile.avatarUrl}
                      alt={googleProfile.name}
                      className="w-10 h-10 rounded-full border border-akr-gold/50 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-akr-gold/20 flex items-center justify-center text-akr-gold font-bold">
                      {googleProfile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{googleProfile.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Google Verified
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">{googleProfile.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  title="Disconnect Google account"
                  className="p-1 rounded-full text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <GoogleButton
                    onClick={() => googleSignUp()}
                    disabled={isGoogleLoading || isSubmitting}
                  >
                    {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
                  </GoogleButton>
                </div>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-akr-border/60" />
                  <span className="text-[11px] uppercase tracking-widest text-akr-text-dim">
                    OR REGISTER WITH EMAIL
                  </span>
                  <div className="flex-1 h-[1px] bg-akr-border/60" />
                </div>
              </>
            )}

            {googleProfile && (
              <div className="mb-4 p-2.5 rounded-xl bg-akr-gold/10 border border-akr-gold/20 text-left">
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Google account connected. Please enter your mobile number and set a password to finalize your account.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <InputField
                label="Full Name"
                placeholder="e.g. Ramesh Varma"
                icon={<User className="w-4 h-4" />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <InputField
                label="10-Digit Mobile Number"
                placeholder="e.g. 9876543210"
                icon={<Phone className="w-4 h-4" />}
                error={errors.mobile?.message}
                {...register('mobile')}
              />

              <InputField
                label="Email Address"
                type="email"
                placeholder="e.g. ramesh@example.com"
                disabled={Boolean(googleProfile)}
                icon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <InputField
                label="Address (Optional)"
                placeholder="City, State, Pincode"
                icon={<MapPin className="w-4 h-4" />}
                error={errors.address?.message}
                {...register('address')}
              />

              <InputField
                label="Password"
                type="password"
                placeholder="Min 6 characters"
                icon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />

              <InputField
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                icon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-akr-gold"
                    {...register('agreeTerms')}
                  />
                  <span className="text-xs text-akr-text-muted leading-tight">
                    I agree to the{' '}
                    <span className="text-akr-gold underline">Terms & Conditions</span> and{' '}
                    <span className="text-akr-gold underline">Privacy Policy</span> of AKR Credit Capital.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="text-xs text-akr-danger mt-1">{errors.agreeTerms.message}</p>
                )}
              </div>

              <div className="pt-3">
                <GoldButton type="submit" isLoading={isSubmitting}>
                  {googleProfile ? 'Complete Google Registration' : 'Verify Email & Register'}
                </GoldButton>
              </div>
            </form>

            <div className="text-center mt-4">
              <p className="text-xs text-akr-text-muted">
                Already have an account?{' '}
                <Link to="/app/login" className="text-akr-gold font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
