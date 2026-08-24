import { createSignal, createStore, For, Show } from 'solid-js';
import { educationSchema, extractYoutubeId } from '@qrnlab/shared';
import { flattenError } from 'zod';
import { api, mediaUrl } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { EducationEntry } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

type SectionKey = EducationEntry['section'];

type FormValues = {
  section: SectionKey;
  heading: string;
  description: string;
  links: { label: string; url: string }[];
  youtubeLinks: string[];
  images: string[];
};

export type EducationEditorProps = {
  entry: EducationEntry | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EducationEditor(props: EducationEditorProps) {
  const [values, setValues] = createStore<FormValues>({
    section: props.entry?.section ?? 'lecture-notes',
    heading: props.entry?.heading ?? '',
    description: props.entry?.description ?? '',
    links: props.entry?.links ? props.entry.links.map((l) => ({ label: l.label, url: l.url })) : [],
    youtubeLinks: props.entry?.youtubeLinks ? [...props.entry.youtubeLinks] : [],
    images: props.entry?.images ? [...props.entry.images] : [],
  });

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  let fileRef: HTMLInputElement | undefined;

  const addLink = () => setValues((d) => { d.links.push({ label: '', url: '' }); });
  const removeLink = (index: number) =>
    setValues((d) => { d.links = d.links.filter((_, i) => i !== index); });

  const addYoutube = () => setValues((d) => { d.youtubeLinks.push(''); });
  const removeYoutube = (index: number) =>
    setValues((d) => { d.youtubeLinks = d.youtubeLinks.filter((_, i) => i !== index); });

  const addImage = (url: string) => setValues((d) => { d.images.push(url); });
  const removeImage = (url: string) =>
    setValues((d) => { d.images = d.images.filter((u) => u !== url); });

  const handleUpload = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'page');
    setUploading(true);
    try {
      const res = await api<{ url: string }>('/media', { method: 'POST', body: form });
      addImage(res.url);
      toast.success('Image uploaded', { description: file.name });
    } catch (err) {
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Could not upload the image.',
      });
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleSubmit = async () => {
    const hasInvalidVideo = values.youtubeLinks.some(
      (url) => url.trim() !== '' && extractYoutubeId(url) === null,
    );
    if (hasInvalidVideo) {
      setErrors({ youtubeLinks: 'Every video URL must be a valid YouTube link.' });
      return;
    }

    const parsed = educationSchema.safeParse({
      section: values.section,
      heading: values.heading,
      description: values.description.trim() || undefined,
      links: values.links,
      youtubeLinks: values.youtubeLinks,
      images: values.images,
    });

    if (!parsed.success) {
      const flat = flattenError(parsed.error);
      const next: Record<string, string> = {};
      for (const [key, messages] of Object.entries(flat.fieldErrors)) {
        if (!messages?.length) continue;
        const top = key.split('.')[0].split('[')[0];
        if (!next[top]) next[top] = messages[0];
      }
      if (flat.formErrors.length && !next.form) next.form = flat.formErrors[0];
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      if (props.entry) {
        await api(`/content/education/${props.entry.id}`, {
          method: 'PUT',
          body: JSON.stringify(parsed.data),
        });
        toast.success('Entry updated');
      } else {
        await api('/content/education', { method: 'POST', body: JSON.stringify(parsed.data) });
        toast.success('Entry created');
      }
      props.onSaved();
      props.onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      class="flex flex-col gap-5"
      novalidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <Field label="Section" required>
          <Select
            value={values.section}
            disabled={saving()}
            onInput={(event) =>
              setValues((d) => { d.section = event.currentTarget.value as SectionKey; })
            }
          >
            <option value="lecture-notes">Lecture notes</option>
            <option value="presentations">Presentations</option>
            <option value="posters">Posters</option>
          </Select>
        </Field>

        <Field label="Heading" required error={errors().heading}>
          <Input
            value={values.heading}
            disabled={saving()}
            placeholder="Entanglement and why it matters"
            onInput={(event) => setValues((d) => { d.heading = event.currentTarget.value; })}
          />
        </Field>
      </div>

      <Field label="Description" error={errors().description}>
        <Textarea
          value={values.description}
          rows={3}
          disabled={saving()}
          placeholder="Optional short description shown under the heading."
          onInput={(event) => setValues((d) => { d.description = event.currentTarget.value; })}
        />
      </Field>

      <Field label="Links" error={errors().links}>
        <div class="flex flex-col gap-2">
          <For each={values.links}>
            {(link, index) => (
              <div class="flex items-start gap-2">
                <Input
                  placeholder="Label"
                  value={link.label}
                  disabled={saving()}
                  onInput={(event) =>
                    setValues((d) => {
                      const link = d.links[index()];
                      if (link) link.label = event.currentTarget.value;
                    })
                  }
                />
                <Input
                  placeholder="https://…"
                  value={link.url}
                  disabled={saving()}
                  onInput={(event) =>
                    setValues((d) => {
                      const link = d.links[index()];
                      if (link) link.url = event.currentTarget.value;
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="shrink-0"
                  disabled={saving()}
                  aria-label="Remove link"
                  onClick={() => removeLink(index())}
                >
                  ×
                </Button>
              </div>
            )}
          </For>
          <Button type="button" variant="outline" size="sm" class="self-start" disabled={saving()} onClick={addLink}>
            Add link
          </Button>
        </div>
      </Field>

      <Field
        label="Videos"
        hint="YouTube URLs — watch?v=, youtu.be, shorts and embed links are all supported."
        error={errors().youtubeLinks}
      >
        <div class="flex flex-col gap-2">
          <For each={values.youtubeLinks}>
            {(url, index) => {
              const valid = url.trim() === '' ? true : extractYoutubeId(url) !== null;
              return (
                <div class="flex items-start gap-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={url}
                    invalid={!valid}
                    disabled={saving()}
                    onInput={(event) =>
                      setValues((d) => { d.youtubeLinks[index()] = event.currentTarget.value; })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    class="shrink-0"
                    disabled={saving()}
                    aria-label="Remove video"
                    onClick={() => removeYoutube(index())}
                  >
                    ×
                  </Button>
                </div>
              );
            }}
          </For>
          <Button type="button" variant="outline" size="sm" class="self-start" disabled={saving()} onClick={addYoutube}>
            Add video
          </Button>
        </div>
      </Field>

      <Field label="Images" error={errors().images}>
        <div class="flex flex-col gap-3">
          <Show when={values.images.length > 0}>
            <div class="flex flex-wrap gap-3">
              <For each={values.images}>
                {(key) => {
                  const src = mediaUrl(key);
                  return (
                    <div class="relative">
                      <Show
                        when={src}
                        fallback={
                          <div class="h-16 w-16 rounded-[var(--radius)] border border-border bg-fg/5" />
                        }
                      >
                        {(value) => (
                          <img
                            src={value()}
                            alt=""
                            class="h-16 w-16 rounded-[var(--radius)] border border-border object-cover"
                          />
                        )}
                      </Show>
                      <button
                        type="button"
                        class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg-raised font-mono text-[10px] leading-none text-fg-soft transition-colors hover:border-red hover:text-red"
                        disabled={saving()}
                        aria-label="Remove image"
                        onClick={() => removeImage(key)}
                      >
                        ×
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>

          <div class="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              class="hidden"
              disabled={uploading()}
              onChange={handleUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={uploading()}
              disabled={saving() || uploading()}
              onClick={() => fileRef?.click()}
            >
              Upload image
            </Button>
            <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
              PNG, JPG, WebP · max 10 MB
            </span>
          </div>
        </div>
      </Field>

      <Show when={errors().form}>
        <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
          {errors().form}
        </p>
      </Show>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" disabled={saving()} onClick={props.onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving()}>
          {props.entry ? 'Save changes' : 'Create entry'}
        </Button>
      </div>
    </form>
  );
}
