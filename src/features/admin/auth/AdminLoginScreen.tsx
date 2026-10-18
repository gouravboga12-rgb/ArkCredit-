import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Lock, Mail, AlertCircle, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { adminLoginSchema, AdminLoginFormData } from '../../../core/validation';
import { adminAuthService } from '../../../services/adminAuthService';
import { AkrLogo } from '../../../assets/logo';
import { GoldButton, InputField } from '../../../components/ui';

export const AdminLoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: 'admin@akr.com',
      password: 'Admin@123',
    },
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      setServerError(null);
      await adminAuthService.login(data.email, data.password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setServerError(err.message || 'Invalid admin credentials');
    }
  };

  const fillDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setServerError(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col justify-center items-center p-4 selection:bg-akr-gold selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 w-96 h-96 bg-akr-gold/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#131316] border border-akr-border/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Prototype Home</span>
          </button>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-akr-gold/15 text-akr-gold border border-akr-gold/30">
            Admin Auth
          </span>
        </div>

        {/* Brand & Heading */}
        <div className="pt-6 pb-4 text-center">
          <div className="flex justify-center mb-3">
            <AkrLogo size="md" variant="image" />
          </div>
          <h1 className="text-xl font-bold font-sans text-white">
            Administrative Control Panel
          </h1>
          <p className="text-xs text-akr-text-muted mt-1">
            Restricted business access. Enter corporate credentials.
          </p>
        </div>

        {/* Demo Fast-Fill Box */}
        <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-akr-gold mb-2">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Demo Admin Roles:
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin@akr.com', 'Admin@123')}
              className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono text-center border border-zinc-700 transition-colors"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('staff@akr.com', 'Staff@123')}
              className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono text-center border border-zinc-700 transition-colors"
            >
              Staff Admin
            </button>
          </div>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <InputField
            label="Corporate Email Address"
            type="email"
            placeholder="admin@akr.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            label="Security Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="pt-2">
            <GoldButton type="submit" isLoading={isSubmitting}>
              Authenticate & Open Portal
            </GoldButton>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
          <p>Protected by AKR Multi-Tenant Session Isolation.</p>
        </div>
      </div>
    </div>
  );
};
