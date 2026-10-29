import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, AlertCircle, Sparkles, UserPlus } from 'lucide-react';
import { consumerLoginSchema, ConsumerLoginFormData } from '../../../core/validation';
import { consumerAuthService } from '../../../services/consumerAuthService';
import { AkrLogo } from '../../../assets/logo';
import { GoldButton, OutlineGoldButton, GoogleButton, InputField } from '../../../components/ui';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isNotRegisteredError, setIsNotRegisteredError] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConsumerLoginFormData>({
    resolver: zodResolver(consumerLoginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: ConsumerLoginFormData) => {
    try {
      setServerError(null);
      setIsNotRegisteredError(false);
      await consumerAuthService.login(data.identifier, data.password);
      navigate('/app/home');
    } catch (err: any) {
      setServerError(err.message || 'Invalid credentials');
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsGoogleLoading(true);
        setServerError(null);
        setIsNotRegisteredError(false);
        await consumerAuthService.loginWithGoogle({
          accessToken: tokenResponse.access_token,
        });
        navigate('/app/home');
      } catch (err: any) {
        if (err.data?.code === 'ACCOUNT_NOT_FOUND' || err.status === 404) {
          setIsNotRegisteredError(true);
          setServerError(
            err.data?.error ||
              'No account found with this Google email. Please complete Sign Up first.'
          );
        } else {
          setServerError(err.message || 'Google sign-in failed');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (error) => {
      console.warn('Google Sign-In canceled or failed:', error);
      setIsGoogleLoading(false);
    },
  });

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-6 pb-4 bg-akr-bg text-white relative overflow-hidden">
      {/* Decorative Gold Sheen Background */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-akr-gold/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10">
        {/* AKR Brand Logo */}
        <div className="pt-2 pb-6 flex justify-center">
          <AkrLogo size="lg" variant="image" />
        </div>

        {/* Welcome Back Header */}
        <div className="mb-6 text-left">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Welcome Back
          </h1>
          <p className="text-xs text-akr-text-muted mt-1 leading-relaxed">
            Sign in to your AKR Credit Capital account and stay in control.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex flex-col gap-2 text-xs text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
            {isNotRegisteredError && (
              <button
                type="button"
                onClick={() => navigate('/app/signup')}
                className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-akr-gold text-black font-semibold text-xs hover:bg-akr-gold-light transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Go to Sign Up
              </button>
            )}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <InputField
            label="Account ID, Mobile Number or Email"
            placeholder="e.g. 9876543210, user@gmail.com, or AKR account ID"
            icon={<Mail className="w-4 h-4" />}
            error={errors.identifier?.message}
            {...register('identifier')}
          />

          <InputField
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Continue with Google */}
          <div className="pt-1">
            <GoogleButton
              onClick={() => googleLogin()}
              disabled={isGoogleLoading || isSubmitting}
            >
              {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
            </GoogleButton>
          </div>

          {/* Sign In Primary Button */}
          <div className="pt-1">
            <GoldButton type="submit" isLoading={isSubmitting}>
              Sign In
            </GoldButton>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center pt-1">
            <Link
              to="/app/forgot-password"
              className="text-xs text-akr-text-muted hover:text-akr-gold transition-colors font-medium inline-block py-1"
            >
              Forgot Password?
            </Link>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-[1px] bg-akr-border/60" />
            <span className="text-[11px] uppercase tracking-widest text-akr-text-dim font-medium">OR</span>
            <div className="flex-1 h-[1px] bg-akr-border/60" />
          </div>

          {/* Create Account Button */}
          <div>
            <OutlineGoldButton
              type="button"
              onClick={() => navigate('/app/signup')}
            >
              Create Account
            </OutlineGoldButton>
          </div>

          {/* Switch to Admin Portal Link */}
          <div className="pt-4 text-center border-t border-zinc-800/80 mt-2">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-akr-gold transition-colors font-medium py-1.5 px-3 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
            >
              <span>💼</span>
              <span>Switch to Admin Panel</span>
              <span className="text-[10px] text-zinc-500">→</span>
            </Link>
          </div>
        </form>
      </div>

      {/* Elegant Bottom Gold Wave Graphic Accent */}
      <div className="relative mt-6 pt-4 flex justify-center opacity-40 pointer-events-none">
        <svg viewBox="0 0 400 60" className="w-full max-w-sm text-akr-gold fill-none stroke-current stroke-[0.8]">
          <path d="M0 45 C 100 20, 200 60, 300 25 C 350 10, 380 30, 400 20" />
          <path d="M0 52 C 120 30, 220 55, 320 30 C 370 20, 390 35, 400 30" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
};
