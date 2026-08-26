import { useNavigate } from '@solidjs/router';
import { Badge } from '../ui/Badge';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '../ui/Dropdown';

export type UserMenuProps = {
  user: { name: string; email: string; role: string };
  onLogout?: () => void;
};

export function UserMenu(props: UserMenuProps) {
  const navigate = useNavigate();
  const initials = () =>
    props.user.name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <Dropdown>
      <DropdownTrigger
        class="flex h-8 items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-raised pl-1 pr-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-soft transition-colors hover:border-amber hover:text-fg"
        aria-label="Account menu"
      >
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-amber font-display text-[10px] font-bold text-[#211404]">
          {initials()}
        </span>
        <span class="hidden sm:inline">{props.user.name.split(' ')[0]}</span>
      </DropdownTrigger>
      <DropdownContent align="end">
        <div class="px-2.5 pb-1.5 pt-2">
          <div class="font-display text-[13px] font-semibold text-fg">{props.user.name}</div>
          <div class="mt-0.5 text-xs text-fg-faint">{props.user.email}</div>
        </div>
        <DropdownSeparator />
        <DropdownLabel>Role</DropdownLabel>
        <div class="px-2.5 pb-1.5">
          <Badge tone="amber">{props.user.role}</Badge>
        </div>
        <DropdownSeparator />
        <DropdownItem onSelect={() => navigate('/account')}>
          Profile
        </DropdownItem>
        <DropdownItem onSelect={() => navigate('/account/posts')}>
          My posts
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onSelect={() => props.onLogout?.()}>
          Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
