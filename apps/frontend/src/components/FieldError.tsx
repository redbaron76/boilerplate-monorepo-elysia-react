/**
 * Componente FieldError — display uniforme degli errori di validazione TanStack Form.
 * Elimina la duplicazione del pattern di render degli errori in 5+ file.
 */
interface FieldErrorProps {
  errors?: (string | { message: string })[] | null | undefined;
}

export function FieldError({ errors }: FieldErrorProps) {
  if (!errors || errors.length === 0) return null;

  const messages = errors
    .flatMap((e) => (typeof e === 'string' ? e : e.message))
    .filter(Boolean);

  if (messages.length === 0) return null;

  return <p className="text-sm text-destructive mt-1">{messages.join(', ')}</p>;
}
