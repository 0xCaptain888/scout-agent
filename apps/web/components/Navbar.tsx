'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Activity, BarChart3, MessageSquare, Cpu, Coins } from 'lucide-react';
import clsx from 'clsx';

const NAV_LINKS = [
  { href: '/markets', label: 'Markets', icon: BarChart3 },
  { href: '/mint', label: 'Mint', icon: Coins },
  { href: '/dashboard', label: 'Dashboard', icon: Activity },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-neon-green/10 border border-neon-green/30 group-hover:shadow-neon-green transition-all">
              <Cpu className="h-4 w-4 text-neon-green" />
            </div>
            <span className="text-lg font-bold text-white">
              Scout<span className="text-neon-green">Agent</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'text-neon-green bg-neon-green/10'
                      : 'text-muted hover:text-white hover:bg-surface'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
              <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-xs mono text-muted">X Layer Testnet</span>
            </div>
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div
                    {...(!mounted && {
                      'aria-hidden': true,
                      style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                    })}
                  >
                    {!connected ? (
                      <button onClick={openConnectModal} className="btn-primary text-sm !px-4 !py-2">
                        Connect Wallet
                      </button>
                    ) : (
                      <button
                        onClick={openAccountModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-neon-green/30 text-sm font-medium text-white hover:border-neon-green/60 transition-all"
                      >
                        <div className="h-2 w-2 rounded-full bg-neon-green" />
                        <span className="mono text-xs">{account.displayName}</span>
                      </button>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'p-2 rounded-lg transition-all',
                    isActive ? 'text-neon-green bg-neon-green/10' : 'text-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
