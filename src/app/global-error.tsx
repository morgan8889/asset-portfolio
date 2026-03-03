'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, sans-serif',
            gap: '16px',
            padding: '32px',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Something went wrong</h2>
          <p style={{ color: '#666', maxWidth: '400px', textAlign: 'center' }}>
            A critical error occurred. Your data is safe in your browser&apos;s local
            storage.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#000',
              color: '#fff',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
