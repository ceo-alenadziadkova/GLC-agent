import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';

export function ImportWordingDialog(props: {
  open: boolean;
  importJsonText: string;
  importParseError: string | null;
  onOpenChange: (open: boolean) => void;
  onImportTextChange: (value: string) => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  const { open, importJsonText, importParseError, onOpenChange, onImportTextChange, onCancel, onImport } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{W.dialogs.importTitle}</DialogTitle>
          <DialogDescription>{W.dialogs.importDescription}</DialogDescription>
        </DialogHeader>
        {importParseError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{importParseError}</p>
        )}
        <textarea
          className="glc-input min-h-[160px] w-full text-xs font-mono"
          value={importJsonText}
          onChange={e => onImportTextChange(e.target.value)}
          placeholder={W.dialogs.importPlaceholder}
          aria-label={W.dialogs.importAriaLabel}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <button type="button" className="glc-btn-secondary" onClick={onCancel}>{W.dialogs.cancel}</button>
          <button type="button" className="glc-btn-primary" onClick={onImport}>{W.dialogs.import}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
