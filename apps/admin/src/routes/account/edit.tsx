import { createEffect, createSignal, createStore, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { z } from 'zod';
import { profileSchema } from '@qrnlab/shared';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { api, mediaUrl } from '../../lib/api';
import { useSession } from '../../lib/session';
import { toast } from '../../lib/toast';
import type { Profile } from '../../lib/types';
import { RequireAuth } from '../guard';

type LinkRow = { label: string; url: string };

type FormState = {
  category: 'member' | 'alumni';
  name: string;
  title: string;
  role: string;
  focus: string;
  email: string;
  bio: string;
  website: string;
  scholar: string;
  linkedin: string;
  github: string;
  currentPosition: string;
  currentInstitution: string;
  yearGraduated: string;
  links: LinkRow[];
  publications: string[];
  image: string;
};

const EMPTY_FORM: FormState = {
  category: 'member',
  name: '',
  title: '',
  role: '',
  focus: '',
  email: '',
  bio: '',
  website: '',
  scholar: '',
  linkedin: '',
  github: '',
  currentPosition: '',
  currentInstitution: '',
  yearGraduated: '',
  links: [],
  publications: [],
  image: '',
};

function toFormState(profile: Profile | null): FormState {
  if (!profile) return { ...EMPTY_FORM };
  return {
    category: profile.category === 'pi' ? 'member' : profile.category,
    name: profile.name,
    title: profile.title ?? '',
    role: profile.role ?? '',
    focus: profile.focus ?? '',
    email: profile.email ?? '',
    bio: profile.bio ?? '',
    website: profile.website ?? '',
    scholar: profile.scholar ?? '',
    linkedin: profile.linkedin ?? '',
    github: profile.github ?? '',
    currentPosition: profile.currentPosition ?? '',
    currentInstitution: profile.currentInstitution ?? '',
    yearGraduated: profile.yearGraduated ? String(profile.yearGraduated) : '',
    links: profile.links.map((link) => ({ label: link.label, url: link.url })),
    publications: profile.publications,
    image: profile.image ?? '',
  };
}

type FieldIssue = { path: (string | number | symbol)[]; message: string };

function collectIssues(issues: readonly FieldIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function mergeProfile(
  existing: Profile | null,
  userId: string,
  values: z.output<typeof profileSchema>,
): Profile {
  const now = new Date().toISOString();
  return {
    userId: existing?.userId ?? userId,
    status: 'pending',
    slug: existing?.slug ?? null,
    category: existing?.category === 'pi' ? 'pi' : values.category,
    name: values.name,
    title: values.title ?? null,
    image: values.image ?? null,
    role: values.role ?? null,
    focus: values.focus ?? null,
    email: values.email ?? null,
    bio: values.bio ?? null,
    website: values.website ?? null,
    scholar: values.scholar ?? null,
    linkedin: values.linkedin ?? null,
    github: values.github ?? null,
    currentPosition: values.currentPosition ?? null,
    currentInstitution: values.currentInstitution ?? null,
    institutionPage: existing?.institutionPage ?? null,
    yearGraduated: values.yearGraduated ?? null,
    links: values.links ?? [],
    publications: values.publications ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export default function AccountEdit() {
  const navigate = useNavigate();
  const { session, setProfile } = useSession();
  const profile = () => session()?.profile ?? null;
  const isPi = () => profile()?.category === 'pi';

  const [form, setForm] = createStore<FormState>({ ...EMPTY_FORM });
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [hydrated, setHydrated] = createSignal(false);

  createEffect(() => {
    const p = session()?.profile;
    if (!p || hydrated()) return;
    setForm(() => toFormState(p));
    setHydrated(true);
  });

  const errorFor = (key: string) => errors()[key];
  const groupError = (prefix: string) => {
    const entries = errors();
    return entries[prefix] ?? (Object.keys(entries).some((key) => key.startsWith(`${prefix}.`))
      ? 'Check the rows below.'
      : undefined);
  };

  let avatarInputRef: HTMLInputElement | undefined;

  const addLink = () => setForm((s) => { s.links = [...s.links, { label: '', url: '' }]; });
  const removeLink = (index: number) =>
    setForm((s) => { s.links = s.links.filter((_, idx) => idx !== index); });

  const addPublication = () => setForm((s) => { s.publications = [...s.publications, '']; });
  const removePublication = (index: number) =>
    setForm((s) => { s.publications = s.publications.filter((_, idx) => idx !== index); });

  const onAvatarChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'avatar');
      const res = await api<{ ok: boolean; id: string; key: string; url: string }>('/media', {
        method: 'POST',
        body: fd,
      });
      setForm((s) => { s.image = res.url; });
      toast.success('Avatar uploaded', { description: 'Save your profile to keep it.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      toast.error('Avatar upload failed', { description: message });
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrors({});

    const payload = {
      category: form.category,
      name: form.name,
      title: form.title.trim() || undefined,
      image: form.image || undefined,
      role: form.role.trim() || undefined,
      focus: form.focus.trim() || undefined,
      email: form.email.trim() || undefined,
      bio: form.bio || undefined,
      website: form.website.trim() || undefined,
      scholar: form.scholar.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      github: form.github.trim() || undefined,
      currentPosition: form.currentPosition.trim() || undefined,
      currentInstitution: form.currentInstitution.trim() || undefined,
      yearGraduated: form.yearGraduated.trim() ? Number(form.yearGraduated) : undefined,
      links: form.links
        .filter((link) => link.label.trim() !== '' || link.url.trim() !== '')
        .map((link) => ({ label: link.label, url: link.url })),
      publications: form.publications.map((item) => item.trim()).filter(Boolean),
    };

    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(collectIssues(parsed.error.issues));
      toast.error('Check the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      await api<{ ok: boolean; status: string }>('/members', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      const user = session()?.user;
      setProfile(mergeProfile(profile(), user?.id ?? '', parsed.data));
      toast.success('Profile submitted for review', {
        description: 'It will appear on the site after admin review.',
      });
      navigate('/account', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit the profile.';
      setErrors({ _form: message });
      toast.error('Submission failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth>
      <div class="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <span class="eyebrow">Account</span>
          <h1 class="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            Edit profile
          </h1>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
            Changes are submitted for review and published on the team page once approved.
          </p>
        </header>

        <Card>
          <form class="flex flex-col gap-6" onSubmit={onSubmit} novalidate>
            <Show when={errorFor('_form')}>
              <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
                {errorFor('_form')}
              </p>
            </Show>

            <CardHeader eyebrow="Team" title="Identity" />
            <CardContent class="flex flex-col gap-4">
              <Field label="Category" error={errorFor('category')}>
                <Select
                  name="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((s) => { s.category = event.currentTarget.value as 'member' | 'alumni'; })
                  }
                  disabled={isPi()}
                >
                  <option value="member">Member</option>
                  <option value="alumni">Alumni</option>
                </Select>
              </Field>
              <Show when={isPi()}>
                <p class="-mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-amber">
                  This profile is a principal investigator — the category is managed by admins.
                </p>
              </Show>

              <div class="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required error={errorFor('name')}>
                  <Input
                    type="text"
                    name="name"
                    value={form.name}
                    onInput={(event) => setForm((s) => { s.name = event.currentTarget.value; })}
                    placeholder="Ada Lovelace"
                  />
                </Field>
                <Field label="Title" error={errorFor('title')}>
                  <Input
                    type="text"
                    name="title"
                    value={form.title}
                    onInput={(event) => setForm((s) => { s.title = event.currentTarget.value; })}
                    placeholder="Research associate"
                  />
                </Field>
                <Field label="Role" error={errorFor('role')}>
                  <Input
                    type="text"
                    name="role"
                    value={form.role}
                    onInput={(event) => setForm((s) => { s.role = event.currentTarget.value; })}
                    placeholder="Quantum computation"
                  />
                </Field>
                <Field label="Focus" error={errorFor('focus')}>
                  <Input
                    type="text"
                    name="focus"
                    value={form.focus}
                    onInput={(event) => setForm((s) => { s.focus = event.currentTarget.value; })}
                    placeholder="Open quantum systems"
                  />
                </Field>
                <Field label="Email" error={errorFor('email')}>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onInput={(event) => setForm((s) => { s.email = event.currentTarget.value; })}
                    autocomplete="email"
                    placeholder="you@example.com"
                  />
                </Field>
              </div>

              <Field label="Avatar" hint="PNG or JPEG, up to 10 MB. Stored on QRNLab media.">
                <div class="flex items-center gap-4">
                  <Show
                    when={mediaUrl(form.image)}
                    fallback={
                      <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border bg-bg font-display text-lg font-bold text-fg-soft">
                        {(form.name.trim() || '?').slice(0, 2).toUpperCase()}
                      </div>
                    }
                  >
                    {(src) => (
                      <img
                        src={src()}
                        alt="Avatar preview"
                        class="h-16 w-16 shrink-0 rounded-[var(--radius)] border border-border object-cover"
                      />
                    )}
                  </Show>
                  <div class="flex flex-col gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      name="avatar"
                      accept="image/*"
                      class="hidden"
                      onChange={onAvatarChange}
                      disabled={uploading()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={uploading()}
                      onClick={() => avatarInputRef?.click()}
                    >
                      {uploading() ? 'Uploading…' : form.image ? 'Replace avatar' : 'Upload avatar'}
                    </Button>
                    <Show when={form.image}>
                      <button
                        type="button"
                        class="self-start font-mono text-[11px] uppercase tracking-[0.06em] text-red hover:underline"
                        onClick={() => setForm((s) => { s.image = ''; })}
                      >
                        Remove
                      </button>
                    </Show>
                  </div>
                </div>
              </Field>
            </CardContent>

            <CardHeader eyebrow="Background" title="Biography" />
            <CardContent class="flex flex-col gap-4">
              <Field label="Bio" error={errorFor('bio')}>
                <Textarea
                  name="bio"
                  rows={5}
                  value={form.bio}
                  onInput={(event) => setForm((s) => { s.bio = event.currentTarget.value; })}
                  placeholder="Short research biography shown on the team page."
                />
              </Field>
              <div class="grid gap-4 sm:grid-cols-2">
                <Field label="Current position" error={errorFor('currentPosition')}>
                  <Input
                    type="text"
                    name="currentPosition"
                    value={form.currentPosition}
                    onInput={(event) => setForm((s) => { s.currentPosition = event.currentTarget.value; })}
                    placeholder="Postdoctoral researcher"
                  />
                </Field>
                <Field label="Current institution" error={errorFor('currentInstitution')}>
                  <Input
                    type="text"
                    name="currentInstitution"
                    value={form.currentInstitution}
                    onInput={(event) => setForm((s) => { s.currentInstitution = event.currentTarget.value; })}
                    placeholder="University of Example"
                  />
                </Field>
                <Field label="Year graduated" error={errorFor('yearGraduated')}>
                  <Input
                    type="number"
                    name="yearGraduated"
                    min={1900}
                    max={2100}
                    value={form.yearGraduated}
                    onInput={(event) => setForm((s) => { s.yearGraduated = event.currentTarget.value; })}
                    placeholder="2026"
                  />
                </Field>
              </div>
            </CardContent>

            <CardHeader eyebrow="Links" title="On the web" />
            <CardContent class="flex flex-col gap-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <Field label="Website" error={errorFor('website')}>
                  <Input
                    type="text"
                    name="website"
                    value={form.website}
                    onInput={(event) => setForm((s) => { s.website = event.currentTarget.value; })}
                    placeholder="https://qrnlab.org"
                  />
                </Field>
                <Field label="Google Scholar" error={errorFor('scholar')}>
                  <Input
                    type="text"
                    name="scholar"
                    value={form.scholar}
                    onInput={(event) => setForm((s) => { s.scholar = event.currentTarget.value; })}
                    placeholder="https://scholar.google.com/..."
                  />
                </Field>
                <Field label="LinkedIn" error={errorFor('linkedin')}>
                  <Input
                    type="text"
                    name="linkedin"
                    value={form.linkedin}
                    onInput={(event) => setForm((s) => { s.linkedin = event.currentTarget.value; })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </Field>
                <Field label="GitHub" error={errorFor('github')}>
                  <Input
                    type="text"
                    name="github"
                    value={form.github}
                    onInput={(event) => setForm((s) => { s.github = event.currentTarget.value; })}
                    placeholder="https://github.com/..."
                  />
                </Field>
              </div>

              <Field label="Additional links" error={groupError('links')}>
                <div class="flex flex-col gap-2">
                  <For each={form.links}>
                    {(link, i) => (
                      <div class="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                          type="text"
                          value={link.label}
                          onInput={(event) => setForm((s) => { s.links[i()].label = event.currentTarget.value; })}
                          placeholder="Label"
                        />
                        <Input
                          type="text"
                          value={link.url}
                          onInput={(event) => setForm((s) => { s.links[i()].url = event.currentTarget.value; })}
                          placeholder="https://..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove link"
                          onClick={() => removeLink(i())}
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </For>
                  <Button type="button" variant="outline" size="sm" class="self-start" onClick={addLink}>
                    Add link
                  </Button>
                </div>
              </Field>
            </CardContent>

            <CardHeader eyebrow="Output" title="Publications" />
            <CardContent class="flex flex-col gap-2">
              <Field label="Selected publications" hint="One per row — a plain-text citation or DOI." error={groupError('publications')}>
                <div class="flex flex-col gap-2">
                  <For each={form.publications}>
                    {(publication, i) => (
                      <div class="flex items-start gap-2">
                        <Textarea
                          rows={2}
                          value={publication}
                          onInput={(event) => setForm((s) => { s.publications[i()] = event.currentTarget.value; })}
                          placeholder="Author, A. et al. Title. Venue (year)."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove publication"
                          onClick={() => removePublication(i())}
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </For>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="self-start"
                    onClick={addPublication}
                  >
                    Add publication
                  </Button>
                </div>
              </Field>
            </CardContent>

            <CardFooter class="justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/account')} disabled={submitting()}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting()} disabled={uploading()}>
                {submitting() ? 'Submitting…' : 'Submit for review'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </RequireAuth>
  );
}
