export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
}

// --- Profile Types ---
export interface PublicProfile {
  id: number;
  nickname: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface OwnProfile extends PublicProfile {
  updatedAt: string;
}
