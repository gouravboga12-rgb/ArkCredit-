import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, Mail, Lock, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';
import { consumerSignUpSchema, ConsumerSignUpFormData } from '../../../core/validation';
import { consumerAuthService } from '../../../services/consumerAuthService';
import { AkrLogo } from '../../../assets/logo';
import { GoldButton, GoogleButton, InputField } from '../../../components/ui';

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsumerSignUpFormData>({
    resolver: zodResolver(consumerSignUpSchema),
    defaultValues: {
      agreeTerms: false,
    },
  });

  const onSubmit = async (data: ConsumerSignUpFormData) => {
    try {
      setServerError(null);
      await consumerAuthService.signUp({
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email,
        password: data.password,
        address: data.address,
      });
      navigate('/app/home');
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      setServerError(null);
      await consumerAuthService.loginWithGoogle();
      navigate('/app/home');
    } catch (err: any) {
      setServerError(err.message || 'Google registration failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-6 bg-akr-bg text-white relative overflow-y-auto">
      <div>
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Title */}
        <div className="mb-6 text-left">
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Create Account
          </h1>
          <p className="text-xs text-akr-text-muted mt-1">
            Join AKR Credit Capital and streamline your EMI & dues management.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Google Quick Sign Up */}
        <div className="mb-4">
          <GoogleButton onClick={handleGoogleSignUp} disabled={isGoogleLoading || isSubmitting}>
            {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
          </GoogleButton>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-[1px] bg-akr-border/60" />
          <span className="text-[11px] uppercase tracking-widest text-akr-text-dim">OR REGISTER WITH EMAIL</span>
          <div className="flex-1 h-[1px] bg-akr-border/60" />
        </div>

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
              Complete Registration
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
    </div>
  );
};
