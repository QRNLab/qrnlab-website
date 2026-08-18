import katex from "katex";
import { marked } from "marked";
import { api } from "./api";

export type PostStatus = "draft" | "submitted" | "rejected" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  authorId: string;
  authorName: string | null;
  tags: string[];
  status: PostStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Me {
  id: string;
  role: string;
  canModerate: boolean;
}

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  rejected: "Rejected",
  published: "Published",
};

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
  submitted: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
  rejected: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
  published: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
};

export function statusLabel(status: PostStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusBadge(status: PostStatus): string {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return `<span class="inline-block rounded px-2 py-0.5 text-xs font-medium ${style}">${statusLabel(status)}</span>`;
}

export function renderMath(src: string): string {
  return src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) =>
      katex.renderToString(tex, { displayMode: true, throwOnError: false }),
    )
    .replace(/\$([^$\n]+?)\$/g, (_, tex: string) =>
      katex.renderToString(tex, { displayMode: false, throwOnError: false }),
    );
}

export function renderPreview(md: string): string {
  const html = marked.parse(renderMath(md), { async: false }) as string;
  return `<div class="prose">${html}</div>`;
}

export function formatDate(value: string | number | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

const btnBase =
  "rounded px-3 py-1 text-xs transition-opacity hover:opacity-90";
const btnBorder =
  "rounded border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";

export function mkButton(text: string, kind: "primary" | "border" | "danger", onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  if (kind === "primary") {
    b.className = `${btnBase} bg-[#0b0d39] dark:bg-[#f4f2c7] font-medium text-white dark:text-[#0b0d39]`;
  } else if (kind === "border") {
    b.className = btnBorder;
  } else {
    b.className = `${btnBase} border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`;
  }
  b.addEventListener("click", onClick);
  return b;
}

export interface PostPayload {
  title: string;
  excerpt?: string;
  body: string;
  tags: string[];
}

export interface PostFormOptions {
  form: HTMLFormElement;
  idInput: HTMLInputElement;
  titleInput: HTMLInputElement;
  excerptInput: HTMLInputElement;
  tagsInput: HTMLInputElement;
  bodyInput: HTMLTextAreaElement;
  imageInput: HTMLInputElement;
  imageStatus: HTMLElement;
  errorEl: HTMLElement;
  doneEl: HTMLElement;
  previewEl: HTMLElement;
  previewToggle: HTMLElement;
  editorEl: HTMLElement;
  editorTitle: HTMLElement;
  onSaved: () => Promise<void>;
}

export interface PostFormController {
  openNew(): void;
  openEdit(post: BlogPost): void;
  getEditingId(): string | null;
  readPayload(): PostPayload;
  saveDraft(): Promise<void>;
  setMessage(text: string | null, isError?: boolean): void;
  showEditor(): void;
}

export function bindPostForm(o: PostFormOptions): PostFormController {
  let editingId: string | null = null;

  function setMessage(text: string | null, isError = false): void {
    o.errorEl.classList.toggle("hidden", !(isError && text));
    o.doneEl.classList.toggle("hidden", !(!isError && text));
    if (text) (isError ? o.errorEl : o.doneEl).textContent = text;
  }

  function showEditor(): void {
    o.editorEl.classList.remove("hidden");
    o.bodyInput.focus();
  }

  function openNew(): void {
    editingId = null;
    o.idInput.value = "";
    o.titleInput.value = "";
    o.excerptInput.value = "";
    o.tagsInput.value = "";
    o.bodyInput.value = "";
    o.errorEl.classList.add("hidden");
    o.doneEl.classList.add("hidden");
    o.previewEl.classList.add("hidden");
    o.editorTitle.textContent = "New post";
    showEditor();
  }

  function openEdit(post: BlogPost): void {
    editingId = post.id;
    o.idInput.value = post.id;
    o.titleInput.value = post.title;
    o.excerptInput.value = post.excerpt ?? "";
    o.tagsInput.value = (post.tags ?? []).join(", ");
    o.bodyInput.value = post.body;
    o.errorEl.classList.add("hidden");
    o.doneEl.classList.add("hidden");
    o.previewEl.classList.add("hidden");
    o.editorTitle.textContent = `Edit: ${post.title}`;
    showEditor();
  }

  function readPayload(): PostPayload {
    return {
      title: o.titleInput.value,
      excerpt: o.excerptInput.value || undefined,
      body: o.bodyInput.value,
      tags: o.tagsInput.value.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  o.imageInput.addEventListener("change", async () => {
    const file = o.imageInput.files?.[0];
    if (!file) return;
    o.imageStatus.textContent = "Uploading…";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "blog");
    try {
      const data = await api<{ url: string }>("/media", { method: "POST", body: formData });
      const insert = `\n\n![${file.name.replace(/\.[^.]+$/, "")}](${data.url})\n\n`;
      const start = o.bodyInput.selectionStart ?? o.bodyInput.value.length;
      o.bodyInput.value = o.bodyInput.value.slice(0, start) + insert + o.bodyInput.value.slice(start);
      o.bodyInput.focus();
      o.bodyInput.setSelectionRange(start + insert.length, start + insert.length);
      o.imageStatus.textContent = "Image inserted.";
      if (!o.previewEl.classList.contains("hidden")) {
        o.previewEl.innerHTML = renderPreview(o.bodyInput.value);
      }
    } catch (err: any) {
      o.imageStatus.textContent = err.message ?? "Upload failed.";
    }
    o.imageInput.value = "";
    setTimeout(() => (o.imageStatus.textContent = ""), 3000);
  });

  o.form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveDraft();
  });

  o.previewToggle.addEventListener("click", () => {
    o.previewEl.classList.toggle("hidden");
    if (!o.previewEl.classList.contains("hidden")) {
      o.previewEl.innerHTML = renderPreview(o.bodyInput.value);
    }
  });

  let previewTimer: ReturnType<typeof setTimeout>;
  o.bodyInput.addEventListener("input", () => {
    if (o.previewEl.classList.contains("hidden")) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      o.previewEl.innerHTML = renderPreview(o.bodyInput.value);
    }, 250);
  });

  async function saveDraft(): Promise<void> {
    setMessage(null);
    const payload = readPayload();
    try {
      if (editingId) {
        await api(`/content/blog/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const data = await api<{ id: string }>("/content/blog", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        editingId = data.id;
        o.idInput.value = data.id;
      }
      setMessage("Draft saved.");
      await o.onSaved();
    } catch (err: any) {
      setMessage(err.message ?? "Save failed.", true);
    }
  }

  return { openNew, openEdit, getEditingId: () => editingId, readPayload, saveDraft, setMessage, showEditor };
}

export interface PostListActions {
  edit(post: BlogPost): void;
  submit(post: BlogPost): void;
  publish(post: BlogPost): void;
  reject(post: BlogPost): void;
  remove(post: BlogPost): void;
  viewUrl(post: BlogPost): string | null;
}

export function renderPostList(opts: {
  container: HTMLElement;
  posts: BlogPost[];
  me: Me;
  actions: PostListActions;
  emptyText?: string;
}): void {
  const { container, posts, me, actions, emptyText } = opts;
  container.innerHTML = "";
  if (posts.length === 0) {
    container.innerHTML = `<p class="text-sm text-neutral-500 dark:text-neutral-400 italic">${emptyText ?? "No posts."}</p>`;
    return;
  }

  const order: PostStatus[] = me.canModerate
    ? ["submitted", "draft", "rejected", "published"]
    : ["draft", "submitted", "rejected", "published"];

  for (const status of order) {
    const group = posts.filter((p) => p.status === status);
    if (group.length === 0) continue;

    const heading = document.createElement("div");
    heading.className = "mt-6 first:mt-0 mb-2 flex items-center gap-2";
    heading.innerHTML = `<h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">${statusLabel(status)}</h3>`;
    if (me.canModerate && status === "submitted") {
      heading.innerHTML += `<span class="rounded bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">${group.length} awaiting review</span>`;
    }
    container.appendChild(heading);

    for (const post of group) {
      const row = document.createElement("div");
      row.className = "flex items-start justify-between gap-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 mb-3";

      const info = document.createElement("div");
      info.className = "min-w-0";
      const titleEl = document.createElement("p");
      titleEl.className = "font-medium text-neutral-900 dark:text-neutral-100 break-words";
      titleEl.textContent = post.title;
      info.appendChild(titleEl);

      const meta = document.createElement("p");
      meta.className = "mt-1 text-xs text-neutral-500 dark:text-neutral-400";
      const bits = [formatDate(post.updatedAt)];
      if (me.canModerate && post.authorName) bits.push(`by ${post.authorName}`);
      if (post.publishedAt) bits.push(`published ${new Date(post.publishedAt).toLocaleDateString()}`);
      meta.textContent = bits.join(" · ");
      info.appendChild(meta);

      if (post.status === "rejected" && post.reviewNote) {
        const note = document.createElement("p");
        note.className = "mt-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap";
        note.innerHTML = `<span class="font-medium">Reviewer note:</span> ${post.reviewNote}`;
        info.appendChild(note);
      }

      const actionsEl = document.createElement("div");
      actionsEl.className = "flex shrink-0 flex-wrap gap-2";

      const viewUrl = actions.viewUrl(post);
      if (viewUrl) {
        const a = document.createElement("a");
        a.href = viewUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "rounded border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";
        a.textContent = "View";
        actionsEl.appendChild(a);
      }

      actionsEl.appendChild(mkButton("Edit", "border", () => actions.edit(post)));

      if (me.canModerate) {
        if (post.status !== "published") {
          actionsEl.appendChild(mkButton("Publish", "primary", () => actions.publish(post)));
        }
        if (post.status === "submitted") {
          actionsEl.appendChild(mkButton("Reject", "danger", () => actions.reject(post)));
        }
      } else if (post.status === "draft" || post.status === "rejected") {
        actionsEl.appendChild(mkButton("Submit for review", "primary", () => actions.submit(post)));
      }

      if (post.status !== "published" || me.canModerate) {
        actionsEl.appendChild(mkButton("Delete", "danger", () => actions.remove(post)));
      }

      row.appendChild(info);
      row.appendChild(actionsEl);
      container.appendChild(row);
    }
  }
}
