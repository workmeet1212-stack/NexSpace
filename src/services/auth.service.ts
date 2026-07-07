import api from './api';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../types/auth.types';

export const authService = {
  async register(data: RegisterData): Promise<{ user: User; message: string }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post('/auth/refresh-token');
    return response.data.data;
  },

  async verifyEmail(email: string, otp: string): Promise<AuthResponse> {
    const response = await api.post('/auth/verify-email', { email, otp });
    return response.data.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { email, otp, newPassword });
  },

  async resendOTP(email: string, purpose: 'email_verify' | 'password_reset'): Promise<void> {
    await api.post('/auth/resend-otp', { email, purpose });
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch('/auth/me', data);
    return response.data.data;
  },

  async completeOnboarding(): Promise<void> {
    await api.post('/auth/complete-onboarding');
  },
};
