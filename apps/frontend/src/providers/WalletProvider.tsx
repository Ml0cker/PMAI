'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CP = ConnectionProvider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SWP = SolanaWalletProvider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WMP = WalletModalProvider as any;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
    []
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <CP endpoint={endpoint}>
      <SWP wallets={wallets} autoConnect>
        <WMP>{children}</WMP>
      </SWP>
    </CP>
  );
}
