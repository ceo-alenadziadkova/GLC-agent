import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';

export function WorkspaceInfoDialog(props: { infoMessage: string | null; onClose: () => void }) {
  const { infoMessage, onClose } = props;
  return (
    <AlertDialog open={infoMessage !== null} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{W.dialogs.noticeTitle}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">{infoMessage ?? ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={onClose}>{W.dialogs.ok}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
