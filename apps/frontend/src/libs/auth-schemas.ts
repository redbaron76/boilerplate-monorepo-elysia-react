import { z } from 'zod';
import { registerSchema } from '@mono/shared';

/**
 * Schema combinato per la registrazione con conferma password.
 * Include il campo confirmPassword non presente nello schema base.
 */
export const registerWithConfirmSchema = registerSchema.merge(
  z.object({
    confirmPassword: z.string().min(8, 'Conferma la password (min 8 caratteri)'),
  })
);

/**
 * Schema completo per la validazione cross-field della registrazione.
 * Verifica che password e confirmPassword corrispondano.
 * Usato a livello di form per il submit.
 */
export const registerFullSchema = registerWithConfirmSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Le password non corrispondono',
    path: ['confirmPassword'],
  }
);
