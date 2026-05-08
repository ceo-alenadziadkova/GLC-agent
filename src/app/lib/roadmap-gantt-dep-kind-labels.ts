export const DEPENDENCY_KIND_LABEL: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Finish -> Start',
  SS: 'Start -> Start',
  FF: 'Finish -> Finish',
  SF: 'Start -> Finish',
};

export const DEPENDENCY_KIND_SHORT_LABEL: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'FS',
  SS: 'SS',
  FF: 'FF',
  SF: 'SF',
};

export const DEPENDENCY_KIND_HINT: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Task B starts after Task A is completed.',
  SS: 'Task B starts after Task A starts.',
  FF: 'Task B finishes after Task A is completed.',
  SF: 'Task B finishes after Task A starts.',
};

export const DEPENDENCY_KIND_ORDER: Array<'FS' | 'SS' | 'FF' | 'SF'> = ['FS', 'SS', 'FF', 'SF'];
