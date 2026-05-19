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

// --- Profile Gender ---
export const profileGenderSchema = z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']);
export type ProfileGender = z.infer<typeof profileGenderSchema>;

// --- Profile Input Schemas ---
// Base schema per validazione field-level (senza .refine)
export const updateProfileBaseSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Il nickname deve avere almeno 3 caratteri')
    .max(20, 'Il nickname non può superare i 20 caratteri')
    .regex(/^[a-zA-Z0-9_]+$/, 'Il nickname può contenere solo lettere, numeri e underscore')
    .optional()
    .or(z.literal('')),
  gender: profileGenderSchema.optional().or(z.literal('')),
  birthDate: z.string().refine(
    (val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d < new Date();
    },
    'La data di nascita deve essere una data valida nel passato'
  ).optional().or(z.literal('')),
  avatar: z.string().url('L\'avatar deve essere un URL o data URL valido').optional().or(z.literal('')),
});

// Schema completo con validazione cross-field (almeno un campo)
export const updateProfileSchema = updateProfileBaseSchema.refine(
  (data) => data.nickname || data.gender || data.birthDate || data.avatar,
  { message: 'Almeno un campo deve essere specificato' }
);

// --- Public Profile Response ---
export const publicProfileSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  gender: profileGenderSchema.nullable(),
  birthDate: z.date().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.date(),
});

// --- Inferred Types ---
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ErrorResponse = z.infer<typeof errorSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// --- Shared Constants ---
export const JWT_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const JWT_SECRET_DEFAULT = 'super-secret-key-change-in-production-2024';
