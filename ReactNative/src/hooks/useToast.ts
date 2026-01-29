/**
 * useToast - Hook pour afficher des notifications toast avec support Undo
 */

import { useState, useCallback, useRef } from 'react';
import type { ToastMessage } from '../components/common/Toast';

interface UndoableAction {
  id: string;
  undo: () => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const undoActionsRef = useRef<UndoableAction[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastMessage['type'] = 'info',
      undoAction?: () => void,
      duration?: number
    ) => {
      const id = Date.now().toString();
      
      const toast: ToastMessage = {
        id,
        message,
        type,
        undoAction,
        duration: duration || (undoAction ? 2500 : 1500), // Durée courte
      };

      // Stocker l'action undo si fournie
      if (undoAction) {
        undoActionsRef.current.push({ id, undo: undoAction });
      }

      setToasts((prev) => [...prev, toast]);

      return id;
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Retirer l'action undo correspondante
    undoActionsRef.current = undoActionsRef.current.filter((a) => a.id !== id);
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
    undoActionsRef.current = [];
  }, []);

  // Raccourcis pour les différents types
  const success = useCallback(
    (message: string, undoAction?: () => void) => {
      return showToast(message, 'success', undoAction);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, undoAction?: () => void) => {
      return showToast(message, 'warning', undoAction);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, undoAction?: () => void) => {
      return showToast(message, 'info', undoAction);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string) => {
      return showToast(message, 'error', undefined, 5000);
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
    success,
    warning,
    info,
    error,
  };
}

export default useToast;
