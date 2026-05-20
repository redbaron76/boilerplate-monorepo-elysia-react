/**
 * Tipi per la API del profilo con supporto slug.
 */

export interface PublicProfile {
  id: number;
  nickname: string;
  slug: string;
  gender: string | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface ProfileOwn {
  id: number;
  nickname: string | null;
  slug: string | null;
  gender: string | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  nickname?: string;
  slug?: string;
  gender?: string;
  birthDate?: string;
  avatar?: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}
