import { toast as sonnerToast } from 'sonner';

/**
 * Safely convert any error to a readable string
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!error) return 'Erro desconhecido';
  if (error instanceof Error) return error.message || 'Erro desconhecido';

  if (typeof error === 'object') {
    const errorObj = error as Record<string, any>;
    if (errorObj.message && typeof errorObj.message === 'string') return errorObj.message;
    if (errorObj.error && typeof errorObj.error === 'string') return errorObj.error;
    if (errorObj.msg && typeof errorObj.msg === 'string') return errorObj.msg;

    try {
      const stringified = JSON.stringify(error);
      if (stringified && stringified !== '{}' && stringified !== 'null') {
        return `Erro: ${stringified}`;
      }
    } catch {
      // Ignore
    }
  }

  return 'Erro desconhecido ao processar requisição';
}

/**
 * Safe toast wrapper that properly handles error objects
 */
export const toast = {
  success: (message: string) => {
    return sonnerToast.success(message);
  },

  error: (error: unknown, context?: string) => {
    const message = getErrorMessage(error);

    if (context) {
      console.error(`[${context}]`, error);
    } else {
      console.error('Toast error:', error);
    }

    return sonnerToast.error(message);
  },

  info: (message: string) => {
    return sonnerToast.info(message);
  },

  warning: (message: string) => {
    return sonnerToast.warning(message);
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
};
