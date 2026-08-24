import { createContext, createUniqueId, useContext } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';
import { Label } from './Label';

export type FieldContextValue = {
  fieldId: string;
  hintId: string;
  errorId: string;
  hasError: () => boolean;
  hasHint: () => boolean;
};

const FieldContext = createContext<FieldContextValue | undefined>(undefined);

export function useFieldContext(): FieldContextValue | undefined {
  return useContext(FieldContext);
}

export type FieldProps = ParentProps<{
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  class?: string;
}>;

export function Field(props: FieldProps) {
  const fieldId = createUniqueId();
  const hintId = createUniqueId();
  const errorId = createUniqueId();
  const hasError = () => Boolean(props.error);
  const hasHint = () => Boolean(props.hint);

  return (
    <FieldContext value={{ fieldId, hintId, errorId, hasError, hasHint }}>
      <div class={cn('flex flex-col gap-1.5', props.class)}>
        {props.label && (
          <Label for={fieldId} required={props.required}>
            {props.label}
          </Label>
        )}
        {props.children}
        {props.error ? (
          <span id={errorId} role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
            {props.error}
          </span>
        ) : props.hint ? (
          <span id={hintId} class="text-xs leading-relaxed text-fg-faint">
            {props.hint}
          </span>
        ) : null}
      </div>
    </FieldContext>
  );
}
