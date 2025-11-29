import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
        Page not found
      </p>
      <Link 
        href="/en" 
        style={{ 
          color: '#4fe1ff', 
          textDecoration: 'none',
          padding: '0.75rem 1.5rem',
          border: '1px solid #4fe1ff',
          borderRadius: '8px'
        }}
      >
        Go to Home
      </Link>
    </div>
  );
}
