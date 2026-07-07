import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { toast } from 'sonner';

const verifySchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type VerifyFormData = z.infer<typeof verifySchema>;

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const email = (location.state as any)?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormData) => {
    if (!email) {
      toast.error('Email not found. Please try registering again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyEmail(email, data.otp);
      login(response.user, response.accessToken);
      toast.success('Email verified successfully!');
      navigate('/onboarding');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await authService.resendOTP(email, 'email_verify');
      toast.success('New code sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">N</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
        <p className="text-gray-500 mt-1">
          We sent a 6-digit code to<br />
          <span className="font-medium text-gray-700">{email || 'your email'}</span>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          {...register('otp')}
          type="text"
          placeholder="Enter 6-digit code"
          maxLength={6}
          className="text-center text-2xl tracking-widest"
          error={errors.otp?.message}
        />

        <Button type="submit" className="w-full" loading={isLoading}>
          Verify email
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      <div className="text-center mt-6 space-y-2">
        <p className="text-sm text-gray-500">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Resend
          </button>
        </p>

        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
