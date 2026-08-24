import { createContext, createSignal, createUniqueId, useContext } from 'solid-js';
import type { Accessor, ParentProps } from 'solid-js';
import { cn } from '../../lib/cn';

type TabsContextValue = {
  selected: Accessor<string>;
  select: (value: string) => void;
  triggerId: (value: string) => string;
  panelId: (value: string) => string;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('<TabsTrigger>/<TabsContent> must be used within <Tabs>');
  return ctx;
}

export type TabsProps = ParentProps<{
  value?: string | Accessor<string>;
  onChange?: (value: string) => void;
  defaultValue?: string;
  class?: string;
}>;

export function Tabs(props: TabsProps) {
  const [internal, setInternal] = createSignal<string>(props.defaultValue ?? '');
  const baseId = createUniqueId();

  const selected = () => {
    const value = props.value;
    const controlled = typeof value === 'function' ? (value as Accessor<string>)() : value;
    return controlled ?? internal();
  };

  const select = (value: string) => {
    setInternal(value);
    props.onChange?.(value);
  };

  const triggerId = (value: string) => `${baseId}-${value}-tab`;
  const panelId = (value: string) => `${baseId}-${value}-panel`;

  return (
    <TabsContext value={{ selected, select, triggerId, panelId }}>
      <div class={props.class}>{props.children}</div>
    </TabsContext>
  );
}

export type TabsListProps = ParentProps<{
  class?: string;
  'aria-label'?: string;
}>;

export function TabsList(props: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-label={props['aria-label']}
      class={cn('flex items-center gap-1 border-b border-border', props.class)}
    >
      {props.children}
    </div>
  );
}

export type TabsTriggerProps = ParentProps<{
  value: string;
  disabled?: boolean;
  class?: string;
}>;

function handleTabKey(event: KeyboardEvent, tabs: TabsContextValue, value: string) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const list = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
  if (!list) return;
  const triggers = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
  if (!triggers.length) return;
  const index = triggers.findIndex((el) => el.id === tabs.triggerId(value));
  let next: number;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = triggers.length - 1;
  else if (event.key === 'ArrowRight') next = (index + 1) % triggers.length;
  else next = (index - 1 + triggers.length) % triggers.length;
  triggers[next].focus();
  const nextValue = triggers[next].getAttribute('data-value');
  if (nextValue) tabs.select(nextValue);
}

export function TabsTrigger(props: TabsTriggerProps) {
  const tabs = useTabsContext();
  const active = () => tabs.selected() === props.value;
  return (
    <button
      type="button"
      role="tab"
      id={tabs.triggerId(props.value)}
      data-value={props.value}
      aria-selected={active() ? 'true' : 'false'}
      aria-controls={tabs.panelId(props.value)}
      tabindex={active() ? 0 : -1}
      disabled={props.disabled}
      onClick={() => tabs.select(props.value)}
      onKeyDown={(event) => handleTabKey(event, tabs, props.value)}
      class={cn(
        'relative -mb-px border-b-2 px-3 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] transition-colors',
        active() ? 'border-amber text-fg' : 'border-transparent text-fg-faint hover:text-fg-soft',
        props.disabled && 'pointer-events-none opacity-40',
        props.class,
      )}
    >
      {props.children}
    </button>
  );
}

export type TabsContentProps = ParentProps<{
  value: string;
  class?: string;
}>;

export function TabsContent(props: TabsContentProps) {
  const tabs = useTabsContext();
  const active = () => tabs.selected() === props.value;
  return (
    <div
      role="tabpanel"
      id={tabs.panelId(props.value)}
      aria-labelledby={tabs.triggerId(props.value)}
      tabindex={active() ? 0 : -1}
      hidden={!active()}
      class={cn('pt-4 outline-none', props.class)}
    >
      {props.children}
    </div>
  );
}
