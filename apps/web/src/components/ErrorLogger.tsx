'use client';

import { useEffect } from 'react';
import { getErrorMessage } from '@/utils/errorHandler';

export function ErrorLogger() {
  useEffect(() => {
    const logToServer = async (level: string, message: string, extra?: any) => {
      try {
        await fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            stack: extra?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            context: window.location.pathname,
          }),
        });
      } catch (e) {
        // Silently fail - don't want logging errors to break the app
      }
    };

    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);

      // Properly serialize all arguments
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }
          if (typeof arg === 'object' && arg !== null) {
            // Use our error handler for objects
            return getErrorMessage(arg);
          }
          return String(arg);
        })
        .join(' ');

      logToServer('error', message, { stack: new Error().stack });
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = getErrorMessage(event.error) || event.message;
      console.error('[UNHANDLED ERROR]', errorMessage, event.error);
      logToServer('error', errorMessage, {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = getErrorMessage(event.reason);
      console.error('[UNHANDLED PROMISE REJECTION]', errorMessage);
      logToServer('error', `Unhandled Promise Rejection: ${errorMessage}`, {
        stack: event.reason?.stack,
      });
    };

    // Capture chunk load errors specifically
    const handleChunkError = (event: Event) => {
      const target = event.target as HTMLScriptElement | HTMLLinkElement;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const src = 'src' in target ? target.src : 'href' in target ? target.href : '';
        console.error('[CHUNK LOAD ERROR]', src);
        logToServer('error', `ChunkLoadError: Failed to load ${src}`, {
          src,
          tagName: target.tagName,
        });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleChunkError, true); // Capture phase

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleChunkError, true);
    };
  }, []);

  return null;
}
