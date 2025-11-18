'use client';

import dynamic from 'next/dynamic';

const PrivyProvider = dynamic(
  async () => (await import('@privy-io/react-auth')).PrivyProvider,
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  if (!appId) {
    console.error("❌ Missing NEXT_PUBLIC_PRIVY_APP_ID in your .env file");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'dark',
          accentColor: '#00FFFF',
        },
        embeddedWallets: {
          createOnLogin: true,
          showWalletUIs: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
