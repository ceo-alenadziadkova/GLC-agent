import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';

export function StopPipelineDialog(props: {
  open: boolean;
  isStopping: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmStop: () => void;
}) {
  const { open, isStopping, onOpenChange, onConfirmStop } = props;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{PM.detail.stopPipeline}</AlertDialogTitle>
          <AlertDialogDescription>{PM.detail.stopPipelineConfirm}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isStopping}>{PM.detail.stopPipelineCancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmStop} disabled={isStopping}>
            {isStopping ? PM.detail.stopPipelineStopping : PM.detail.stopPipeline}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
