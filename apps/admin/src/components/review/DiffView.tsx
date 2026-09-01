import { createMemo, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { diffField } from '@qrnlab/shared';
import type { DiffHunk, FieldDiff } from '@qrnlab/shared';
import { cn } from '../../lib/cn';

export type DiffFieldConfig = { key: string; label: string; longText?: boolean };

export type DiffViewProps = {
  /** Null → first submission: render the single "after" view with no diff. */
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  fields: DiffFieldConfig[];
  /** Optional custom cell renderer (e.g. markdown body, profile image). */
  render?: (key: string, value: unknown) => JSX.Element | null;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
};

function formatPlain(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ');
  }
  return JSON.stringify(value);
}

function SingleValue(props: {
  value: unknown;
  fieldKey: string;
  render?: DiffViewProps['render'];
}) {
  const custom = createMemo(() => props.render?.(props.fieldKey, props.value) ?? null);
  return (
    <Show
      when={custom() !== null}
      fallback={
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {formatPlain(props.value) || '—'}
        </p>
      }
    >
      {custom()}
    </Show>
  );
}

function PaneValue(props: {
  raw: unknown;
  formatted: string;
  fieldKey: string;
  render?: DiffViewProps['render'];
  tone?: 'add' | 'del';
}) {
  const custom = createMemo(() => props.render?.(props.fieldKey, props.raw) ?? null);
  return (
    <Show
      when={custom() !== null}
      fallback={
        <p
          class={cn(
            'whitespace-pre-wrap text-sm leading-relaxed',
            props.tone === 'add' ? 'text-green' : props.tone === 'del' ? 'text-red' : 'text-fg',
          )}
        >
          {props.formatted || '—'}
        </p>
      }
    >
      {custom()}
    </Show>
  );
}

function LinesPane(props: { hunks: DiffHunk[]; side: 'del' | 'add' }) {
  const lines = () => props.hunks.filter((h) => h.type === 'ctx' || h.type === props.side);
  return (
    <pre class="max-h-[32rem] overflow-auto rounded-[var(--radius)] border border-border bg-void p-3 font-mono text-xs leading-relaxed">
      <For each={lines()}>
        {(hunk) => (
          <div
            class={cn(
              'px-2',
              hunk.type === 'ctx'
                ? 'text-fg-faint'
                : hunk.type === 'add'
                  ? 'bg-green/10 text-green'
                  : 'bg-red/10 text-red',
            )}
          >
            {hunk.type === 'add' ? '+' : hunk.type === 'del' ? '-' : ' '}
            {' '}
            {hunk.text || ' '}
          </div>
        )}
      </For>
    </pre>
  );
}

function ListPane(props: { items: string[]; tone: 'add' | 'del' }) {
  return (
    <div class="flex flex-col gap-1">
      <Show
        when={props.items.length > 0}
        fallback={<span class="text-sm text-fg-faint">—</span>}
      >
        <For each={props.items}>
          {(item) => (
            <div
              class={cn(
                'rounded-[var(--radius)] border px-2 py-1 font-mono text-xs',
                props.tone === 'add'
                  ? 'border-green/40 bg-green/10 text-green'
                  : 'border-red/40 bg-red/10 text-red',
              )}
            >
              {item}
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

function Cell(props: {
  label: string;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <div class={cn('flex min-w-0 flex-col gap-1.5', props.class)}>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
        {props.label}
      </span>
      {props.children}
    </div>
  );
}

export function DiffView(props: DiffViewProps) {
  const diffMode = () => props.before !== null;

  const rows = createMemo<FieldDiff[]>(() =>
    props.fields.map((field) =>
      diffField(field.key, props.before?.[field.key] ?? null, props.after[field.key], {
        longText: field.longText,
      }),
    ),
  );

  return (
    <div class={cn('flex flex-col gap-3', props.className)}>
      <Show when={diffMode()}>
        <div class="grid grid-cols-2 gap-4 border-b border-border pb-2">
          <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
            {props.beforeLabel ?? 'Previous submission'}
          </span>
          <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-soft">
            {props.afterLabel ?? 'Pending submission'}
          </span>
        </div>
      </Show>

      <For each={rows()}>
        {(row) => {
          const config = () => props.fields.find((f) => f.key === row.field);
          const label = () => config()?.label ?? row.field;

          if (!diffMode()) {
            return (
              <div class="grid grid-cols-[minmax(9rem,12rem)_1fr] gap-4">
                <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
                  {label()}
                </span>
                <SingleValue
                  value={props.after[row.field]}
                  fieldKey={row.field}
                  render={props.render}
                />
              </div>
            );
          }

          if (row.kind === 'same') {
            return (
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 flex min-w-0 flex-col gap-1.5">
                  <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
                    {label()}
                  </span>
                  <Show when={row.value !== null} fallback={<span class="text-sm text-fg-faint">—</span>}>
                    <p class="whitespace-pre-wrap text-sm leading-relaxed text-fg-soft">
                      {row.value}
                    </p>
                  </Show>
                </div>
              </div>
            );
          }

          if (row.kind === 'lines') {
            return (
              <div class="flex flex-col gap-1.5">
                <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
                  {label()}
                </span>
                <div class="grid grid-cols-2 gap-4">
                  <LinesPane hunks={row.hunks} side="del" />
                  <LinesPane hunks={row.hunks} side="add" />
                </div>
              </div>
            );
          }

          if (row.kind === 'list') {
            return (
              <div class="flex flex-col gap-1.5">
                <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
                  {label()}
                </span>
                <div class="grid grid-cols-2 gap-4">
                  <ListPane items={row.removed} tone="del" />
                  <ListPane items={row.added} tone="add" />
                </div>
              </div>
            );
          }

          if (row.kind === 'changed') {
            return (
              <div class="grid grid-cols-2 gap-4">
                <Cell label={label()} class="rounded-[var(--radius)] border border-red/40 bg-red/5 p-3">
                  <PaneValue
                    raw={props.before?.[row.field]}
                    formatted={row.before}
                    fieldKey={row.field}
                    render={props.render}
                    tone="del"
                  />
                </Cell>
                <Cell label={label()} class="rounded-[var(--radius)] border border-green/40 bg-green/5 p-3">
                  <PaneValue
                    raw={props.after[row.field]}
                    formatted={row.after}
                    fieldKey={row.field}
                    render={props.render}
                    tone="add"
                  />
                </Cell>
              </div>
            );
          }

          if (row.kind === 'added') {
            return (
              <div class="grid grid-cols-2 gap-4">
                <Cell label={label()}>
                  <span class="text-sm text-fg-faint">—</span>
                </Cell>
                <Cell label={label()} class="rounded-[var(--radius)] border border-green/40 bg-green/5 p-3">
                  <PaneValue
                    raw={props.after[row.field]}
                    formatted={row.after}
                    fieldKey={row.field}
                    render={props.render}
                    tone="add"
                  />
                </Cell>
              </div>
            );
          }

          return (
            <div class="grid grid-cols-2 gap-4">
              <Cell label={label()} class="rounded-[var(--radius)] border border-red/40 bg-red/5 p-3">
                <PaneValue
                  raw={props.before?.[row.field]}
                  formatted={row.before}
                  fieldKey={row.field}
                  render={props.render}
                  tone="del"
                />
              </Cell>
              <Cell label={label()}>
                <span class="text-sm text-fg-faint">—</span>
              </Cell>
            </div>
          );
        }}
      </For>
    </div>
  );
}
