/**
 * Utility to safely convert any error object to a readable string message
 */
export function getErrorMessage(error: unknown): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's null or undefined
  if (!error) {
    return 'Erro desconhecido';
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message || 'Erro desconhecido';
  }

  // If it's an object with common error properties
  if (typeof error === 'object') {
    const errorObj = error as Record<string, any>;

    // Try common error message properties
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }

    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }

    if (errorObj.msg && typeof errorObj.msg === 'string') {
      return errorObj.msg;
    }

    if (errorObj.statusText && typeof errorObj.statusText === 'string') {
      return errorObj.statusText;
    }

    // Try to stringify the object
    try {
      const stringified = JSON.stringify(error);
      if (stringified && stringified !== '{}' && stringified !== 'null') {
        return `Erro: ${stringified}`;
      }
    } catch {
      // JSON.stringify failed, continue
    }
  }

  // Last resort
  return 'Erro desconhecido ao processar requisição';
}

/**
 * Safely log error to console with proper formatting
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);

  // Also log the stringified version for debugging
  if (typeof error === 'object' && error !== null) {
    try {
      console.error(`[${context}] Serialized:`, JSON.stringify(error, null, 2));
    } catch {
      console.error(`[${context}] Could not serialize error object`);
    }
  }
}
