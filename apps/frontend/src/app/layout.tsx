import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { WalletProvider } from '@/providers/WalletProvider';
import { QueryProvider } from '@/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'pmai.fun - AI-Powered Polymarket Predictions',
  description: 'Get AI-powered predictions on Polymarket markets. Pay with Bags via Bags.fm on Solana.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <QueryProvider>
          <WalletProvider>
            <Header />
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
