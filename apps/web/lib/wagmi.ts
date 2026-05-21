'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Chain } from 'viem';

export const xlayerTestnet: Chain = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'X Layer Testnet Explorer', url: 'https://www.okx.com/explorer/xlayer-test' },
  },
  testnet: true,
};

export const xlayerMainnet: Chain = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'X Layer Explorer', url: 'https://www.okx.com/explorer/xlayer' },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: 'ScoutAgent',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-project-id',
  chains: [xlayerTestnet, xlayerMainnet],
  transports: {
    [xlayerTestnet.id]: http(),
    [xlayerMainnet.id]: http(),
  },
});
