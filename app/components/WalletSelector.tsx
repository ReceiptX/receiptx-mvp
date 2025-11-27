'use client'

import { useState, useEffect } from 'react';
import { SupraWalletIntegration } from '@/lib/supraWalletIntegration';

interface WalletOption {
  type: 'starkey' | 'metamask' | 'privy' | 'email_deterministic';
  name: string;
  icon: string;
  description: string;
  available: boolean;
  recommended: boolean;
}

export default function WalletSelector({ 
  onConnect 
}: { 
  onConnect: (walletType: string, address: string) => void 
}) {
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detectWallets();
  }, []);

  const detectWallets = async () => {
    try {
      const detection = await SupraWalletIntegration.detectAvailableWallets();
      
      const options: WalletOption[] = [
        {
          type: 'starkey',
          name: 'StarKey',
          icon: '🌟',
          description: 'Supra\'s native wallet - Best for Supra L1',
          available: detection.starkey,
          recommended: detection.recommended_wallet === 'starkey'
        },
        {
          type: 'metamask',
          name: 'MetaMask',
          icon: '🦊',
          description: 'Popular browser wallet - Works with Supra',
          available: detection.metamask,
          recommended: detection.recommended_wallet === 'metamask'
        },
        {
          type: 'privy',
          name: 'Social Login',
          icon: '📧',
          description: 'Connect with email or social accounts',
          available: detection.privy,
          recommended: detection.recommended_wallet === 'privy'
        },
        {
          type: 'email_deterministic',
          name: 'Email Wallet',
          icon: '🔐',
          description: 'Auto-generated wallet - No setup needed',
          available: detection.email_based,
          recommended: detection.recommended_wallet === 'email_deterministic'
        }
      ];

      setWalletOptions(options);
    } catch (err) {
      console.error('Wallet detection error:', err);
      setError('Failed to detect wallets');
    }
  };

  const handleConnect = async (walletType: 'starkey' | 'metamask' | 'privy' | 'email_deterministic') => {
    setConnecting(true);
    setError(null);

    try {
      if (walletType === 'starkey') {
        const result = await SupraWalletIntegration.connectStarKey();
        if (result.success && result.address) {
          onConnect(walletType, result.address);
        } else {
          setError(result.error || 'StarKey connection failed');
        }
      } else if (walletType === 'metamask') {
        const result = await SupraWalletIntegration.connectMetaMask();
        if (result.success && result.address) {
          onConnect(walletType, result.address);
        } else {
          setError(result.error || 'MetaMask connection failed');
        }
      } else if (walletType === 'privy') {
        setError('Please use the Privy login button');
      } else if (walletType === 'email_deterministic') {
        setError('Email wallet is created automatically on signup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="wallet-selector">
      <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
      <p className="text-gray-600 mb-6">
        Choose how you want to connect to ReceiptX
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {walletOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleConnect(option.type)}
            disabled={!option.available || connecting}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              option.available
                ? option.recommended
                  ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {option.name}
                    {option.recommended && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
              </div>
              {!option.available && (
                <span className="text-sm text-gray-500">Not Installed</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {connecting && (
        <div className="mt-4 text-center text-gray-600">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2">Connecting...</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500 text-center">
        <div>Don't have a wallet? No problem!</div>
        <div>An email-based wallet will be created for you automatically.</div>
      </div>
    </div>
  );
}
