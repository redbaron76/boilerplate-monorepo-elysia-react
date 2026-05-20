import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { getOwnProfile, updateOwnProfile, type ProfileOwn, type UpdateProfilePayload } from '@/apis/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, User, Mail, Save, Camera, Trash2, ArrowLeft, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { updateProfileSchema } from '@mono/shared';
import { queryKeys } from '@/libs/query-keys';

function generateSlug(nickname: string): string {
  return nickname
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Guard di autenticazione per la pagina impostazioni.
 * CRITICO: beforeLoad gira FUORI da React → mai usare hooks (useAuthStore).
 * Usare sempre la forma imperativa getState().
 */
function requireAuth() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    window.location.href = '/login';
    throw new Error('UNAUTHENTICATED');
  }
}

const GENDER_OPTIONS = [
  { value: '', label: 'Non specificato' },
  { value: 'MALE', label: 'Maschile' },
  { value: 'FEMALE', label: 'Femminile' },
  { value: 'NON_BINARY', label: 'Non binario' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Preferisco non specificare' },
] as const;

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Usa queryOptions helper pattern invece di hardcoded
  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.ownProfile,
    queryFn: async () => {
      const r = await getOwnProfile();
      if (!r.success) throw new Error(r.error || 'Errore sconosciuto');
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Form persistent: useRef evita re-inizializzazione a ogni render
  const formRef = useRef<ReturnType<typeof useForm> | null>(null);

  const getForm = useCallback(() => {
    if (!formRef.current) {
      formRef.current = useForm({
        defaultValues: {
          nickname: '',
          slug: '',
          gender: '',
          birthDate: '',
          avatar: '',
        },
        onSubmit: async ({ value }) => {
          setFormError('');
          setSuccessMsg('');

          const parsed = updateProfileSchema.safeParse({
            nickname: value.nickname || undefined,
            gender: value.gender || undefined,
            birthDate: value.birthDate || undefined,
            avatar: value.avatar || undefined,
          });

          if (!parsed.success) {
            setFormError(parsed.error.issues.map(e => e.message).join(', '));
            return;
          }

          const cleaned: UpdateProfilePayload = {};
          if (value.nickname) cleaned.nickname = value.nickname;
          if (value.gender && value.gender !== '') cleaned.gender = value.gender as UpdateProfilePayload['gender'];
          if (value.birthDate && value.birthDate !== '') cleaned.birthDate = value.birthDate;
          if (value.avatar && value.avatar !== '') cleaned.avatar = value.avatar;

          if (Object.keys(cleaned).length === 0) {
            setFormError('Nessun campo da aggiornare');
            return;
          }

          setSaving(true);
          await updateMutation.mutateAsync(cleaned);
          setSaving(false);
        },
      });
    }
    return formRef.current;
  }, []);

  // Popola il form quando il profilo è caricato
  const populateForm = useCallback((formData: ReturnType<typeof getForm>) => {
    if (!profile) return;
    formData.setFieldValue('nickname', profile.nickname || '');
    formData.setFieldValue('slug', generateSlug(profile.nickname || ''));
    formData.setFieldValue('gender', profile.gender || '');
    formData.setFieldValue('birthDate', profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '');
    formData.setFieldValue('avatar', profile.avatar || '');
  }, [profile]);

  useEffect(() => {
    const formData = getForm();
    if (profile) {
      populateForm(formData);
    }
  }, [profile, getForm, populateForm]);

  const updateMutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: (data) => {
      // ✅ Usa queryKeys.ownProfile invece di hardcoded
      queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
      // Aggiorna il form con i nuovi dati dal server
      const formData = getForm();
      if (data?.data) {
        formData.setFieldValue('nickname', data.data.nickname || '');
        formData.setFieldValue('slug', generateSlug(data.data.nickname || ''));
        formData.setFieldValue('gender', data.data.gender || '');
        formData.setFieldValue('birthDate', data.data.birthDate ? new Date(data.data.birthDate).toISOString().split('T')[0] : '');
        formData.setFieldValue('avatar', data.data.avatar || '');
      }
      setSuccessMsg('Profilo aggiornato con successo!');
      setFormError('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Errore durante l\'aggiornamento');
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('L\'immagine deve essere inferiore a 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const formData = getForm();
      formData.setFieldValue('avatar', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    // TODO: implement delete account mutation
    logout();
    navigate({ to: '/' });
  };

  // Calcola slug dal nickname corrente
  const currentNickname = profile?.nickname || '';
  const currentSlug = currentNickname ? generateSlug(currentNickname) : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const formData = getForm();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={14} />
        Torna alla dashboard
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Settings className="text-purple-600" size={20} />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Impostazioni Profilo
          </span>
        </h1>
        <p className="text-muted-foreground text-lg">Modifica i tuoi dati pubblici e gestisci il tuo account</p>
      </div>

      <div className="space-y-8">
        {/* Profile Form */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="text-purple-600" size={20} />
              </div>
              <div>
                <CardTitle>Informazioni Profilo</CardTitle>
                <CardDescription>Campi visibili pubblicamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); formData.handleSubmit(); }}
              className="space-y-4"
            >
              {formError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {successMsg && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{successMsg}</AlertDescription>
                </Alert>
              )}

              <form.Field name="nickname">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nickname</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Il tuo nickname pubblico (3-20 caratteri)"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value as string);
                        // Aggiorna automaticamente lo slug
                        formData.setFieldValue('slug', generateSlug(e.target.value as string));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Usato per il profilo pubblico: /{field.state.value || 'nickname'}
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="slug">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Slug URL
                      <span className="ml-2 text-xs text-muted-foreground">(auto-generato)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm flex-1">
                        <span className="text-muted-foreground/70">/</span>
                        <span>{field.state.value || 'slug'}</span>
                      </div>
                      <Sparkles className="text-purple-400" size={14} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      URL del profilo pubblico: <code className="bg-muted px-1 py-0.5 rounded">/{field.state.value || 'slug'}</code>
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="gender">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Genere</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="birthDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Data di nascita</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value as string)}
                    />
                  </div>
                )}
              </form.Field>

              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border/50">
                    {formData.getFieldValue('avatar') ? (
                      <img src={formData.getFieldValue('avatar')} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-500 text-white text-xl font-bold">
                        {profile?.nickname?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-purple-600 hover:text-purple-700">
                      <Camera size={16} />
                      Carica immagine
                      <Input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                    <p className="text-xs text-muted-foreground">PNG, JPG o GIF — max 2MB</p>
                    {formData.getFieldValue('avatar') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 p-0 h-auto"
                        onClick={() => formData.setFieldValue('avatar', '')}
                      >
                        Rimuovi
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md"
                disabled={saving || updateMutation.isPending}
              >
                {saving || updateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvataggio...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save size={16} />
                    Salva modifiche
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="text-blue-600" size={20} />
              </div>
              <div>
                <CardTitle>Dati Account</CardTitle>
                <CardDescription>Informazioni che non possono essere modificate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="text-muted-foreground flex-shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="text-muted-foreground flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-muted-foreground">Nickname Pubblico</p>
                <p className="font-medium">{profile?.nickname || 'Non impostato'}</p>
              </div>
            </div>
            {profile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Settings className="text-muted-foreground flex-shrink-0" size={16} />
                <div>
                  <p className="text-xs text-muted-foreground">Slug Profilo</p>
                  <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">/{currentSlug || 'non impostato'}</code>
                </div>
              </div>
            )}
            {profile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="text-muted-foreground flex-shrink-0" size={16} />
                <div>
                  <p className="text-xs text-muted-foreground">ID Utente</p>
                  <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">#{profile.id}</code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <CardTitle className="text-destructive">Zona Pericolosa</CardTitle>
                <CardDescription>Eliminazione account — azione irreversibile</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Eliminare il tuo account rimuoverà permanentemente tutti i tuoi dati, incluso il profilo pubblico.
              Questa azione non può essere annullata.
            </p>

            {deleteConfirm ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleDelete} className="flex-1">
                    Conferma eliminazione
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleteConfirm}>
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Elimina il mio account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
