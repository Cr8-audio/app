'use client';

import React, { ReactNode, useState, useEffect } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: Error, errorInfo: unknown) => {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      setHasError(true);
    };

    const errorListener = (errorEvent: PromiseRejectionEvent | ErrorEvent) => {
      handleError(
        new Error(
          errorEvent instanceof ErrorEvent
            ? errorEvent.message
            : 'Unhandled promise rejection',
        ),
        errorEvent,
      );
    };

    window.addEventListener('error', errorListener);
    window.addEventListener('unhandledrejection', errorListener);

    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener('unhandledrejection', errorListener);
    };
  }, []);

  if (hasError) {
    return <>{fallback || <h1>Something went wrong.</h1>}</>;
  }

  return <>{children}</>;
};

export default ErrorBoundary;
