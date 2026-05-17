import { z } from 'zod';

// --- Auth Schemas ---
export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z
    .string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .max(100, 'La password non deve superare i 100 caratteri'),
});

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Inserisci la password'),
});

// --- User Schema ---
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// --- Response Schemas ---
export const authResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: userSchema,
  }),
});

export const errorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

// --- Token Schemas ---
export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// --- Inferred Types ---
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ErrorResponse = z.infer<typeof errorSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// --- Shared Constants ---
export const JWT_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
