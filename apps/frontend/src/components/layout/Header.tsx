'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clsx } from 'clsx';

const navLinks = [
  { href: '/', label: 'Markets' },
  { href: '/predictions', label: 'Predictions' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="pmai.fun" className="h-8 w-8 rounded" />
            <span className="text-xl font-bold text-text-primary">
              pma<span className="text-accent-green">i.fun</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-1.5 border border-border text-xs text-text-tertiary">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-green animate-pulse-green" />
            Live
          </div>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
