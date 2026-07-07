export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    emailNotifications: 'never' | 'important' | 'all';
    timezone: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
