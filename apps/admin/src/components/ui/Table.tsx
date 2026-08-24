import type { ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

export type TableProps = ParentProps<{
  class?: string;
}>;

export function Table(props: TableProps) {
  return (
    <div class={cn('w-full overflow-x-auto rounded-[var(--radius)] border border-border', props.class)}>
      <table class="w-full border-collapse text-left text-sm">{props.children}</table>
    </div>
  );
}

export type TableHeadProps = ParentProps<{
  class?: string;
}>;

export function TableHead(props: TableHeadProps) {
  return <thead class={cn('bg-fg/[0.03]', props.class)}>{props.children}</thead>;
}

export type TableBodyProps = ParentProps<{
  class?: string;
}>;

export function TableBody(props: TableBodyProps) {
  return <tbody class={cn('', props.class)}>{props.children}</tbody>;
}

export type TableRowProps = ParentProps<{
  class?: string;
  hoverable?: boolean;
}>;

export function TableRow(props: TableRowProps) {
  return (
    <tr
      class={cn(
        'border-b border-border transition-colors last:border-b-0',
        props.hoverable !== false && 'hover:bg-fg/[0.025]',
        props.class,
      )}
    >
      {props.children}
    </tr>
  );
}

export type TableHeaderProps = ParentProps<{
  class?: string;
}>;

export function TableHeader(props: TableHeaderProps) {
  return (
    <th
      scope="col"
      class={cn(
        'whitespace-nowrap px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-faint',
        props.class,
      )}
    >
      {props.children}
    </th>
  );
}

export type TableCellProps = ParentProps<{
  class?: string;
}>;

export function TableCell(props: TableCellProps) {
  return <td class={cn('px-4 py-3 align-middle', props.class)}>{props.children}</td>;
}
