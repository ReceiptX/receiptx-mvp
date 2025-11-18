'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export function WalletAutoGenerator() {
  const { user, authenticated } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (authenticated && user?.email?.address && !walletAddress && !generating) {
      generateWallet();
    }
  }, [authenticated, user, walletAddress, generating]);

  async function generateWallet() {
    if (!user?.email?.address) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email.address,
          biometrics: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setWalletAddress(data.wallet.address);
        console.log('✅ Seamless wallet generated:', data.wallet.address);
        
        // Store in localStorage for quick access
        localStorage.setItem('receiptx_wallet', data.wallet.address);
      }
    } catch (error) {
      console.error('Wallet generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }

  return null; // Silent background component
}
