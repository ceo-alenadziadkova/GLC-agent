import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { PlanWorkspacePaletteCommand } from '../lib/plan-command-registry';

type PlanCommandRegistryContextValue = {
  registerCommands: (chunkId: string, commands: readonly PlanWorkspacePaletteCommand[]) => void;
  unregisterCommands: (chunkId: string) => void;
  surfaceCommands: readonly PlanWorkspacePaletteCommand[];
};

const PlanCommandRegistryContext = createContext<PlanCommandRegistryContextValue | null>(null);

function mergeChunks(map: ReadonlyMap<string, readonly PlanWorkspacePaletteCommand[]>): PlanWorkspacePaletteCommand[] {
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
  const out: PlanWorkspacePaletteCommand[] = [];
  for (const k of keys) {
    for (const c of map.get(k) ?? []) out.push(c);
  }
  return out;
}

function planCommandsShallowEqual(
  a: readonly PlanWorkspacePaletteCommand[],
  b: readonly PlanWorkspacePaletteCommand[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.label !== y.label || x.keywords !== y.keywords) return false;
  }
  return true;
}

/**
 * Lets Plan workspace surfaces (Board, Table, Shape) register Cmd/Ctrl+K commands merged into {@link usePlanWorkspacePaletteCommands}.
 */
export function PlanCommandRegistryProvider({ children }: { children: ReactNode }) {
  const chunkMapRef = useRef(new Map<string, readonly PlanWorkspacePaletteCommand[]>());
  const [surfaceCommands, setSurfaceCommands] = useState<readonly PlanWorkspacePaletteCommand[]>([]);

  const recompute = useCallback(() => {
    setSurfaceCommands((prev) => {
      const next = mergeChunks(chunkMapRef.current);
      return planCommandsShallowEqual(prev, next) ? prev : next;
    });
  }, []);

  const registerCommands = useCallback(
    (chunkId: string, commands: readonly PlanWorkspacePaletteCommand[]) => {
      chunkMapRef.current.set(chunkId, commands);
      recompute();
    },
    [recompute],
  );

  const unregisterCommands = useCallback(
    (chunkId: string) => {
      chunkMapRef.current.delete(chunkId);
      recompute();
    },
    [recompute],
  );

  const value = useMemo(
    () => ({ registerCommands, unregisterCommands, surfaceCommands }),
    [registerCommands, unregisterCommands, surfaceCommands],
  );

  return <PlanCommandRegistryContext.Provider value={value}>{children}</PlanCommandRegistryContext.Provider>;
}

export function usePlanCommandSurfaceCommands(): readonly PlanWorkspacePaletteCommand[] {
  return useContext(PlanCommandRegistryContext)?.surfaceCommands ?? [];
}

/**
 * Registers a command chunk for the lifetime of the caller mount; unregisters on unmount.
 * `commands` should be referentially stable (e.g. from `useMemo`) to avoid thrashing the registry.
 */
export function usePlanCommandRegistration(chunkId: string, commands: readonly PlanWorkspacePaletteCommand[]) {
  const ctx = useContext(PlanCommandRegistryContext);
  const registerCommands = ctx?.registerCommands;
  const unregisterCommands = ctx?.unregisterCommands;

  // Keep registry entry fresh when command payload changes.
  useEffect(() => {
    if (!registerCommands || !unregisterCommands) return;
    registerCommands(chunkId, commands);
  }, [chunkId, commands, registerCommands, unregisterCommands]);

  // Remove chunk only when component unmounts (or chunk id handler changes),
  // not on every commands dependency update.
  useEffect(() => {
    if (!unregisterCommands) return;
    return () => {
      unregisterCommands(chunkId);
    };
  }, [chunkId, unregisterCommands]);
}
