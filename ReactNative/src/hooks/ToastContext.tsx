/**
 * ToastContext - Contexte global pour les notifications toast
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useToast } from './useToast';
import { ToastContainer } from '../components/common/Toast';
import type { ToastMessage } from '../components/common/Toast';

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastMessage['type'],
    undoAction?: () => void,
    duration?: number
  ) => string;
  dismissToast: (id: string) => void;
  success: (message: string, undoAction?: () => void) => string;
  warning: (message: string, undoAction?: () => void) => string;
  error: (message: string) => string;
  info: (message: string) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
