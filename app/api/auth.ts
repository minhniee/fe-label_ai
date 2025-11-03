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
    } catch (error) {
      console.error("Failed to clear auth tokens from storage:", error);
    }
  }
}
