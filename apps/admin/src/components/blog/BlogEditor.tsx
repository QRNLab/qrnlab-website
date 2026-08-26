import { createMemo, createSignal, Show } from 'solid-js';
import { revalidate } from '@solidjs/router';
import { marked } from 'marked';
import { blogSchema } from '@qrnlab/shared';
import { api, mediaUrl } from '../../lib/api';
import type { BlogPost } from '../../lib/types';
import { hasPermission, useSession } from '../../lib/session';
import { toast } from '../../lib/toast';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Textarea } from '../ui/Textarea';

const STATUS_TONE: Record<BlogPost['status'], BadgeTone> = {
  draft: 'neutral',
  submitted: 'amber',
  published: 'green',
  rejected: 'red',
};

function escapeHtml(source: string): string {
  return source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type BlogEditorProps = {
  initial?: BlogPost | null;
  onSaved: () => void;
  eyebrow?: string;
};

export function BlogEditor(props: BlogEditorProps) {
  const { session } = useSession();
  const canModerate = () => hasPermission('content.moderate');
  const isOwner = () =>
    props.initial ? props.initial.authorId === session()?.user.id : true;

  const [title, setTitle] = createSignal(props.initial?.title ?? '');
  const [excerpt, setExcerpt] = createSignal(props.initial?.excerpt ?? '');
  const [tags, setTags] = createSignal((props.initial?.tags ?? []).join(', '));
  const [body, setBody] = createSignal(props.initial?.body ?? '');
  const [tab, setTab] = createSignal<'write' | 'preview'>('write');
  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  let fileInput: HTMLInputElement | undefined;

  const tagsArray = () =>
    tags()
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  const payload = () => ({
    title: title(),
    excerpt: excerpt().trim() || undefined,
    body: body(),
    tags: tagsArray().length ? tagsArray() : undefined,
  });

  const validate = () => {
    const parsed = blogSchema.safeParse(payload());
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields');
      return null;
    }
    setFieldErrors({});
    return parsed.data;
  };

  const persist = async (): Promise<string | null> => {
    const data = validate();
    if (!data) return null;
    setSaving(true);
    try {
      if (props.initial) {
        await api(`/content/blog/${props.initial.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return props.initial.id;
      }
      const res = await api<{ ok: boolean; id: string }>('/content/blog', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      toast.error('Save failed', { description: message });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const afterSave = async (message: string) => {
    toast.success(message);
    await revalidate(['blog-posts', 'my-posts']);
    props.onSaved();
  };

  const onSaveDraft = async (event: SubmitEvent) => {
    event.preventDefault();
    const id = await persist();
    if (!id) return;
    await afterSave(props.initial ? 'Draft updated' : 'Draft created');
  };

  const onSubmitReview = async () => {
    const id = await persist();
    if (!id) return;
    try {
      await api(`/content/blog/${id}/submit`, { method: 'POST' });
    } catch (err) {
      toast.error('Submit failed', {
        description: err instanceof Error ? err.message : 'Could not submit for review.',
      });
      return;
    }
    await afterSave('Submitted for review');
  };

  const onPublish = async () => {
    const id = await persist();
    if (!id) return;
    try {
      await api(`/content/blog/${id}/publish`, { method: 'POST' });
    } catch (err) {
      toast.error('Publish failed', {
        description: err instanceof Error ? err.message : 'Could not publish the post.',
      });
      return;
    }
    await afterSave('Post published');
  };

  const onUpload = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'blog');
      const res = await api<{ ok: boolean; id: string; key: string; url: string }>(
        '/media',
        { method: 'POST', body: form },
      );
      const url = res.url || mediaUrl(res.key);
      const snippet = `![image](${url})`;
      setBody((current) =>
        current ? `${current.replace(/\s+$/, '')}\n\n${snippet}\n` : `${snippet}\n`,
      );
      toast.success('Image uploaded', { description: 'Markdown inserted at the end of the body.' });
    } catch (err) {
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Could not upload the image.',
      });
    } finally {
      setUploading(false);
    }
  };

  const previewHtml = createMemo(() => {
    const source = body();
    if (!source) return '';
    return marked.parse(escapeHtml(source), { gfm: true, breaks: true, async: false });
  });

  return (
    <div class="flex flex-col gap-6">
      <header>
        <span class="eyebrow eyebrow-cyan">{props.eyebrow ?? 'Blog'} / {props.initial ? 'Edit' : 'New'}</span>
        <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
          {props.initial ? 'Edit post' : 'New post'}
        </h1>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
          Write in Markdown — the preview shows the rendered post. Math-heavy content will show
          as raw markup for now.
        </p>
      </header>

      <Show when={props.initial?.status === 'published' && !canModerate()}>
        <div class="rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-3 text-sm leading-relaxed text-fg-soft">
          This post is published. Saving changes will return it to draft.
        </div>
      </Show>

      <Show when={props.initial}>
        <div class="flex flex-col gap-2">
          <div>
            <Badge tone={STATUS_TONE[props.initial!.status]} dot>
              {props.initial!.status}
            </Badge>
          </div>
          <Show when={props.initial?.reviewNote}>
            <div class="rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-3 text-sm leading-relaxed text-fg-soft">
              <span class="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-amber">
                Review note
              </span>
              <p class="mt-1">{props.initial?.reviewNote}</p>
            </div>
          </Show>
        </div>
      </Show>

      <Card>
        <form class="flex flex-col gap-4" onSubmit={onSaveDraft} novalidate>
          <Field label="Title" required error={fieldErrors().title}>
            <Input
              name="title"
              value={title()}
              onInput={(event) => setTitle(event.currentTarget.value)}
              placeholder="Post title"
              required
            />
          </Field>

          <Field label="Excerpt" error={fieldErrors().excerpt}>
            <Input
              name="excerpt"
              value={excerpt()}
              onInput={(event) => setExcerpt(event.currentTarget.value)}
              placeholder="Short summary (optional)"
            />
          </Field>

          <Field label="Tags" hint="Comma-separated" error={fieldErrors().tags}>
            <Input
              name="tags"
              value={tags()}
              onInput={(event) => setTags(event.currentTarget.value)}
              placeholder="solid, qrn, research"
            />
          </Field>

          <Field label="Body" required error={fieldErrors().body}>
            <Tabs value={tab()} onChange={(value) => setTab(value as 'write' | 'preview')}>
              <TabsList aria-label="Body mode">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <div class="flex flex-col gap-2">
                  <Textarea
                    name="body"
                    value={body()}
                    onInput={(event) => setBody(event.currentTarget.value)}
                    rows={18}
                    placeholder={'Write your post in Markdown…\n\n## Heading\n\nSome **bold** text.'}
                    class="min-h-[360px] resize-y font-mono text-[13px] leading-relaxed"
                    required
                  />
                  <div class="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInput?.click()}
                      isLoading={uploading()}
                      disabled={uploading()}
                    >
                      Upload image
                    </Button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      class="hidden"
                      onChange={onUpload}
                    />
                    <span class="text-xs leading-relaxed text-fg-faint">
                      Uploads to R2 and inserts a Markdown image at the end of the body.
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="preview">
                <div
                  class="space-y-3 overflow-x-auto rounded-[var(--radius)] border border-border bg-bg-raised p-4 text-sm leading-relaxed text-fg [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-4 [&_blockquote]:text-fg-soft [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius)] [&_pre]:bg-void [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:font-mono [&_img]:max-w-full [&_img]:rounded-[var(--radius)] [&_hr]:border-border"
                  innerHTML={previewHtml()}
                />
              </TabsContent>
            </Tabs>
          </Field>

          <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button type="submit" isLoading={saving()}>
              Save draft
            </Button>
            <Show when={canModerate()}>
              <Button type="button" variant="outline" onClick={onPublish} isLoading={saving()}>
                Publish
              </Button>
            </Show>
            <Show when={isOwner() || canModerate()}>
              <Button type="button" variant="outline" onClick={onSubmitReview} isLoading={saving()}>
                Submit for review
              </Button>
            </Show>
          </div>
        </form>
      </Card>
    </div>
  );
}
