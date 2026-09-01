/**
 * Minimal diff utilities for the review views.
 *
 * `diffLines` produces a Myers line diff (no external dependencies). `diffField`
 * compares two JSON values (scalars, arrays, or multi-line text) and returns a
 * normalized description the DiffView component renders as a single or two-pane
 * comparison. A `null` baseline means "first submission" — render the single
 * "after" view instead of a diff.
 */

export type DiffHunk = { type: 'ctx' | 'add' | 'del'; text: string };

export type FieldDiff =
  | { field: string; kind: 'same'; value: string | null }
  | { field: string; kind: 'changed'; before: string; after: string }
  | { field: string; kind: 'added'; after: string }
  | { field: string; kind: 'removed'; before: string }
  | { field: string; kind: 'lines'; hunks: DiffHunk[] }
  | { field: string; kind: 'list'; added: string[]; removed: string[] };

type EditOp = {
  type: 'equal' | 'delete' | 'insert';
  aStart: number;
  bStart: number;
  count: number;
};

/** Myers O(ND) diff over two line arrays; returns a minimal edit script. */
function myers(a: string[], b: string[]): EditOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 1);
  const trace: Int32Array[] = [];

  let reached = false;
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        reached = true;
        break;
      }
    }
    if (reached) break;
  }

  const ops: EditOp[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const t = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && t[offset + k - 1] < t[offset + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = t[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', aStart: x - 1, bStart: y - 1, count: 1 });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) {
        ops.push({ type: 'insert', aStart: x, bStart: prevY, count: y - prevY });
        y = prevY;
      } else {
        ops.push({ type: 'delete', aStart: prevX, bStart: y, count: x - prevX });
        x = prevX;
      }
    }
  }
  ops.reverse();
  return ops;
}

/** Line-by-line diff of two strings → context/add/del hunks. */
export function diffLines(before: string, after: string): DiffHunk[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const ops = myers(a, b);
  const hunks: DiffHunk[] = [];
  for (const op of ops) {
    if (op.type === 'equal') {
      for (let i = 0; i < op.count; i++) hunks.push({ type: 'ctx', text: a[op.aStart + i] });
    } else if (op.type === 'delete') {
      for (let i = 0; i < op.count; i++) hunks.push({ type: 'del', text: a[op.aStart + i] });
    } else {
      for (let i = 0; i < op.count; i++) hunks.push({ type: 'add', text: b[op.bStart + i] });
    }
  }
  return hunks;
}

function formatScalar(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatListItem(item: unknown): string {
  if (item && typeof item === 'object') {
    const rec = item as Record<string, unknown>;
    if ('label' in rec && 'url' in rec) {
      return `${formatScalar(rec.label) ?? ''}: ${formatScalar(rec.url) ?? ''}`;
    }
    if ('name' in rec) return formatScalar(rec.name) ?? '';
  }
  return formatScalar(item) ?? '';
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

/**
 * Compare one field across two payloads.
 *
 * @param opts.longText — render long text (e.g. markdown body, bio) as a
 *   line-level diff instead of a before/after pair.
 */
export function diffField(
  field: string,
  before: unknown,
  after: unknown,
  opts: { longText?: boolean } = {},
): FieldDiff {
  const beforeArr = Array.isArray(before) ? before : undefined;
  const afterArr = Array.isArray(after) ? after : undefined;

  if (beforeArr !== undefined || afterArr !== undefined) {
    const a = (beforeArr ?? []).map(formatListItem);
    const b = (afterArr ?? []).map(formatListItem);
    const removed = a.filter((x) => !b.includes(x));
    const added = b.filter((x) => !a.includes(x));
    if (removed.length === 0 && added.length === 0) {
      return { field, kind: 'same', value: a.length ? a.join('\n') : null };
    }
    return { field, kind: 'list', added, removed };
  }

  const beforeText = formatScalar(before);
  const afterText = formatScalar(after);

  if (opts.longText) {
    if ((beforeText ?? '') === (afterText ?? '')) {
      return { field, kind: 'same', value: beforeText };
    }
    return {
      field,
      kind: 'lines',
      hunks: diffLines(beforeText ?? '', afterText ?? ''),
    };
  }

  if (beforeText === afterText) {
    return { field, kind: 'same', value: beforeText };
  }
  if (isBlank(beforeText)) {
    return { field, kind: 'added', after: afterText ?? '' };
  }
  if (isBlank(afterText)) {
    return { field, kind: 'removed', before: beforeText ?? '' };
  }
  return { field, kind: 'changed', before: beforeText ?? '', after: afterText ?? '' };
}
