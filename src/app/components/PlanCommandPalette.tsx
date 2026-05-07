import { Fragment, useEffect, useMemo, useState } from 'react';

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

  const { modes, views, laneFilters, surface, compile } = useMemo(() => {
    const modes = commands.filter(x => x.id.startsWith('mode-'));
    const views = commands.filter(x => x.id.startsWith('view-'));
    const laneFilters = commands.filter(x => x.id.startsWith('filter-lane-'));
    const compile = commands.filter(x => x.id === 'compile');
    const surface = commands.filter(
      x =>
        !x.id.startsWith('mode-') &&
        !x.id.startsWith('view-') &&
        !x.id.startsWith('filter-lane-') &&
        x.id !== 'compile',
    );
    return { modes, views, laneFilters, surface, compile };
  }, [commands]);

  if (commands.length === 0) return null;

  const c = PLAN_WORKSPACE_UI_COPY;

  const sections: Array<{ key: string; heading: string; items: typeof commands }> = [];
  if (modes.length) sections.push({ key: 'modes', heading: c.commandPaletteGroupModes, items: modes });
  if (views.length) sections.push({ key: 'views', heading: c.commandPaletteGroupViews, items: views });
  if (laneFilters.length) sections.push({ key: 'lanes', heading: c.commandPaletteGroupLanes, items: laneFilters });
  if (surface.length) sections.push({ key: 'surface', heading: c.commandPaletteGroupSurface, items: surface });
  if (compile.length) sections.push({ key: 'compile', heading: c.commandPaletteGroupActions, items: compile });

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
        {sections.map((section, idx) => (
          <Fragment key={section.key}>
            {idx > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={section.heading}>
              {section.items.map(cmd => (
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
          </Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
