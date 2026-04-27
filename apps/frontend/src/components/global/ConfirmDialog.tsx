import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Override the confirm button label (defaults to common.confirm). */
  confirmLabel?: string;
  /** Override the cancel button label (defaults to common.cancel). */
  cancelLabel?: string;
  /** When true the confirm button is rendered with the error palette. */
  destructive?: boolean;
  /** Disable the confirm button while the underlying action is running. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable Yes/No confirmation dialog. Designed for destructive actions
 * (delete listing, suspend user, cancel subscription, …) but works for any
 * decisive prompt.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      {description && (
        <DialogContent>
          {typeof description === 'string' ? (
            <DialogContentText>{description}</DialogContentText>
          ) : (
            description
          )}
        </DialogContent>
      )}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={loading}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
