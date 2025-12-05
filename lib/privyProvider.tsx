'use client';

import dynamic from 'next/dynamic';

const PrivyProvider = dynamic(
  async () => (await import('@privy-io/react-auth')).PrivyProvider,
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.error('Missing NEXT_PUBLIC_PRIVY_APP_ID; rendering without PrivyProvider');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email'],
        embeddedWallets: { createOnLogin: 'disabled' },
        appearance: {
          theme: 'dark',
          accentColor: '#00FFFF',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
