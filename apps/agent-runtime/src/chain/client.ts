import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** X Layer Testnet chain definition */
export const xLayerTestnet = defineChain({
  id: 195,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || "https://testrpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "X Layer Testnet Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer-test",
    },
  },
  testnet: true,
});

/** Public client for read-only operations */
export const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

/**
 * Create a wallet client from a private key.
 * Used for write operations (placing bets, resolving markets, etc.)
 */
export function createAgentWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: xLayerTestnet,
    transport: http(),
  });
}

/** Operator wallet client - used for oracle/admin operations */
export function getOperatorClient() {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  if (!key) throw new Error("OPERATOR_PRIVATE_KEY not set");
  return createAgentWalletClient(key as `0x${string}`);
}
