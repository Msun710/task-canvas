import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState {
  open: boolean;
  config: (ConfirmConfig & { resolve: (value: boolean) => void }) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, config: null });
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, config: { ...config, resolve } });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.config) {
      state.config.resolve(true);
      setState({ open: false, config: null });
    }
  }, [state.config]);

  const handleCancel = useCallback(() => {
    if (state.config) {
      state.config.resolve(false);
    }
    setState({ open: false, config: null });
  }, [state.config]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel]);

  const ConfirmDialogComponent = state.config ? (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.config.title}
      description={state.config.description}
      confirmLabel={state.config.confirmLabel}
      cancelLabel={state.config.cancelLabel}
      variant={state.config.variant}
      onConfirm={handleConfirm}
      isLoading={isLoading}
    />
  ) : null;

  return { confirm, ConfirmDialog: ConfirmDialogComponent, setIsLoading };
}
