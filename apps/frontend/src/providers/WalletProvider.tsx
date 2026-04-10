'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { getRpcUrl, markRpcOk, markRpcFailed, getAllEndpoints } from '@/lib/rpcPool';

import '@solana/wallet-adapter-react-ui/styles.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CP = ConnectionProvider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SWP = SolanaWalletProvider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WMP = WalletModalProvider as any;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [endpoint, setEndpoint] = useState<string>('');

  const pickEndpoint = useCallback(() => {
    const url = getRpcUrl();
    setEndpoint(url);
    return url;
  }, []);

  useEffect(() => {
    pickEndpoint();
  }, [pickEndpoint]);

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  if (!endpoint) return null;

  return (
    <CP endpoint={endpoint} config={{ confirmTransactionInitialTimeout: 30000 }}>
      <SWP wallets={wallets} autoConnect>
        <WMP>{children}</WMP>
      </SWP>
    </CP>
  );
}

export { markRpcOk, markRpcFailed, getAllEndpoints };
