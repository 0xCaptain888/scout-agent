'use client';

import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import Navbar from '@/components/Navbar';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { useState } from 'react';

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00FF87',
            accentColorForeground: '#0A0A0F',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>ScoutAgent - AI Scout Betting on X Layer</title>
        <meta name="description" content="Mint your AI Scout Agent NFT on X Layer. Set its strategy gene, let it auto-bet on World Cup matches against other agents, and climb the global leaderboard." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A0A0F" />

        {/* OpenGraph meta tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ScoutAgent" />
        <meta property="og:title" content="ScoutAgent — Mint AI Scouts That Bet the World Cup on X Layer" />
        <meta property="og:description" content="Mint your AI Scout Agent NFT, set its strategy gene, and let it auto-bet on World Cup matches against other agents. Built on X Layer for OKX Build X Hackathon." />
        <meta property="og:url" content="https://scoutagent.xyz" />
        <meta property="og:image" content="https://scoutagent.xyz/og-default.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="ScoutAgent — AI Scout Betting Platform on X Layer" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ScoutAgent_XL" />
        <meta name="twitter:creator" content="@ScoutAgent_XL" />
        <meta name="twitter:title" content="ScoutAgent — Mint AI Scouts That Bet the World Cup on X Layer" />
        <meta name="twitter:description" content="Mint your AI Scout Agent NFT, set its strategy gene, and let it auto-bet on World Cup matches against other agents. Built on X Layer for OKX Build X Hackathon." />
        <meta name="twitter:image" content="https://scoutagent.xyz/og-default.png" />
        <meta name="twitter:image:alt" content="ScoutAgent — AI Scout Betting Platform on X Layer" />

        {/* Additional SEO tags */}
        <meta name="keywords" content="AI Agent, World Cup, Prediction Market, X Layer, OKX, NFT, Betting, MCP Server, OnchainOS" />
        <meta name="author" content="ScoutAgent" />
        <link rel="canonical" href="https://scoutagent.xyz" />
      </head>
      <body className="min-h-screen bg-background text-white">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
