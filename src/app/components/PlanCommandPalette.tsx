import { useEffect, useState } from 'react';

import { PLAN_WORKSPACE_UI_COPY } from '../config/plan-workspace-ui-copy.en';
import { usePlanWorkspacePaletteCommands } from '../lib/plan-command-registry';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';

/**
 * Global Plan workspace command palette (Cmd/Ctrl+K) on canonical `/plan` routes.
 */
export function PlanCommandPalette() {
  const [open, setOpen] = useState(false);
  const commands = usePlanWorkspacePaletteCommands();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (commands.length === 0) return;
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commands.length]);

  if (commands.length === 0) return null;

  const c = PLAN_WORKSPACE_UI_COPY;
  const modes = commands.filter(x => x.id.startsWith('mode-'));
  const views = commands.filter(x => x.id.startsWith('view-'));
  const actions = commands.filter(x => x.id === 'compile');

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={c.commandPaletteTitle}
      description={c.commandPaletteDescription}
    >
      <CommandInput placeholder={c.commandPalettePlaceholder} />
      <CommandList>
        <CommandEmpty>{c.commandPaletteEmpty}</CommandEmpty>
        <CommandGroup heading={c.commandPaletteGroupModes}>
          {modes.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords}`}
              onSelect={() => {
                cmd.run();
                setOpen(false);
              }}
            >
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={c.commandPaletteGroupViews}>
          {views.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords}`}
              onSelect={() => {
                cmd.run();
                setOpen(false);
              }}
            >
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={c.commandPaletteGroupActions}>
          {actions.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords}`}
              onSelect={() => {
                cmd.run();
                setOpen(false);
              }}
            >
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
