import api from './client';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: any; // Assuming user object is part of the token response
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface MeResponse {
  user_id: number;
  username: string;
  email: string;
  role_id: number;
  role_name: string;
  created_at: string;
}

export async function registerUser(payload: RegisterPayload) {
  try {
    const response = await api.post('/auth/register', payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
    throw new Error(errorMessage);
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    const response = await api.post('/auth/verify-otp', {
      email,
      otp,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'OTP verification failed';
    throw new Error(errorMessage);
  }
}

export async function resendOTP(email: string) {
  try {
    const response = await api.post('/auth/resend-otp', {
      email,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to resend OTP';
    throw new Error(errorMessage);
  }
}

export async function loginUser(username_or_email: string, password: string) {
  try {
    const response = await api.post<TokenResponse>('/auth/login', {
      username_or_email,
      password,
    });
    // After successful login, persist the auth tokens
    if (response.data.access_token) {
      persistAuth(response.data);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
    throw new Error(errorMessage);
  }
}

export function persistAuth(token: TokenResponse) {
  try {
    localStorage.setItem('access_token', token.access_token);
    if (token.refresh_token) {
      localStorage.setItem('refresh_token', token.refresh_token);
    }
    if (token.user) {
      localStorage.setItem('user', JSON.stringify(token.user));
      // If the user object contains a picture from Google, save it separately
      if (token.user.picture) {
        localStorage.setItem('user_picture', token.user.picture);
      }
    }
  } catch (error) {
    console.error("Failed to persist auth tokens:", error);
  }
}

export async function getMe() {
  try {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get user info';
    throw new Error(errorMessage);
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Log error but continue with cleanup
    console.error("Logout API call failed:", error);
  } finally {
    // Always clear local storage on logout
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('picture');
      localStorage.removeItem('user_picture');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      // Clear redirect URL to prevent redirecting to previous user's path
      localStorage.removeItem('redirect_after_login');
    } catch (error) {
      console.error("Failed to clear auth tokens from storage:", error);
    }
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - The refresh token to use
 * @returns New token response with access_token and refresh_token
 */
export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  try {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    // After successful refresh, persist the new auth tokens
    if (response.data.access_token) {
      persistAuth(response.data);
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to refresh token';
    throw new Error(errorMessage);
  }
}

/**
 * Check if user is authenticated by verifying token with backend
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    
    if (!token) {
      return false;
    }
    
    // Verify token is valid by calling /auth/me
    await getMe();
    return true;
  } catch (error) {
    // Token is invalid or expired
    console.log("Authentication check failed:", error);
    
    // Clear invalid tokens
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        // Clear redirect URL to prevent redirecting to previous user's path
        localStorage.removeItem("redirect_after_login");
      }
    } catch {}
    
    return false;
  }
}

// ==================== FORGOT PASSWORD API ====================

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  status: string;
  expireIn: number;
  resendAvailableIn: number;
}

export interface VerifyResetOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyResetOTPResponse {
  success: boolean;
  resetToken: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  try {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password/request', {
      email,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to request password reset';
    throw new Error(errorMessage);
  }
}

export async function verifyResetOTP(email: string, otp: string): Promise<VerifyResetOTPResponse> {
  try {
    const response = await api.post<VerifyResetOTPResponse>('/auth/forgot-password/verify-otp', {
      email,
      otp,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'OTP verification failed';
    throw new Error(errorMessage);
  }
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<ResetPasswordResponse> {
  try {
    const response = await api.post<ResetPasswordResponse>('/auth/forgot-password/reset-password', {
      resetToken,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to reset password';
    throw new Error(errorMessage);
  }
}
