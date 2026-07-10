'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Global UI Boundary Caught Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-500 text-3xl">⚠</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Application Error Detected</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              We encountered an unexpected runtime error (possibly due to an outdated cache or chunk mismatch). 
              Please refresh the application state to continue.
            </p>
            <button
              onClick={() => {
                // Hard refresh the page to clear bad JS chunk cache
                window.location.reload();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
            >
              Refresh Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
