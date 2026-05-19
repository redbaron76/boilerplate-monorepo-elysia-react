import { createFileRoute, Link } from '@tanstack/react-router';
import { usePublicProfileData } from '@/hooks/usePublicProfileData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, MapPin, ArrowLeft } from 'lucide-react';

/**
 * Route profilo pubblico (/:nickname).
 * Mostra i dati pubblici di un utente cercati per nickname.
 */
export const Route = createFileRoute('/$nickname')({
  component: PublicProfilePage,
});

/**
 * Format date in Italian locale.
 */
function formatItalianDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatItalianMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Componente pagina profilo pubblico.
 */
function PublicProfilePage() {
  const { nickname } = Route.useParams();
  const { data, isLoading, error } = usePublicProfileData(nickname);

  const genderLabels: Record<string, string> = {
    MALE: 'Maschile',
    FEMALE: 'Femminile',
    NON_BINARY: 'Non binario',
    PREFER_NOT_TO_SAY: 'Preferisco non specificare',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mb-6 text-6xl">👤</div>
        <h1 className="text-2xl font-bold mb-2">Utente non trovato</h1>
        <p className="text-muted-foreground mb-6">
          L'utente @{nickname} non esiste o è stato eliminato.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Torna alla home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={14} />
        Torna alla home
      </Link>

      {/* Profile Card */}
      <Card className="border-border/50 shadow-card">
        <CardHeader className="text-center pb-4">
          {/* Avatar */}
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden bg-muted mb-4 border-2 border-border/50">
            {data.avatar ? (
              <img src={data.avatar} alt={data.nickname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-3xl font-bold">
                {data.nickname.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">@{data.nickname}</CardTitle>
          <CardDescription>
            Membro dal {formatItalianMonthYear(new Date(data.createdAt))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gender */}
          {data.gender && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="text-muted-foreground flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-muted-foreground">Genere</p>
                <p className="font-medium">{genderLabels[data.gender]}</p>
              </div>
            </div>
          )}

          {/* Birth Date */}
          {data.birthDate && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-muted-foreground">Data di nascita</p>
                <p className="font-medium">
                  {formatItalianDate(new Date(data.birthDate))}
                </p>
              </div>
            </div>
          )}

          {/* User ID */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="text-muted-foreground flex-shrink-0" size={16} />
            <div>
              <p className="text-xs text-muted-foreground">ID Utente</p>
              <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">#{data.id}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
