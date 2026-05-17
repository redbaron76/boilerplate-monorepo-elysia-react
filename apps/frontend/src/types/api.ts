export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface AuthSuccessResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}