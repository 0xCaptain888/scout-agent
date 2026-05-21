import { type Address, type Hex, getAddress } from "viem";
import { publicClient, getOperatorClient } from "./client.js";

// ---------------------------------------------------------------------------
// AgentRegistry ABI (subset used by the runtime)
// ---------------------------------------------------------------------------
export const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "geneOf",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "walletOf",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bankrollOf",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isPaused",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintAgent",
    inputs: [{ name: "gene", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "depositBankroll",
    inputs: [
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "pauseAgent",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ---------------------------------------------------------------------------
// Contract address (loaded from env or deployments)
// ---------------------------------------------------------------------------
const AGENT_REGISTRY_ADDRESS: Address = "0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5";

function getRegistryAddress(): Address {
  const addr = process.env.AGENT_REGISTRY_ADDRESS || AGENT_REGISTRY_ADDRESS;
  return getAddress(addr);
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------
export async function geneOf(tokenId: bigint): Promise<bigint> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "geneOf",
    args: [tokenId],
  });
}

export async function walletOf(tokenId: bigint): Promise<Address> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "walletOf",
    args: [tokenId],
  });
}

export async function bankrollOf(tokenId: bigint): Promise<bigint> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "bankrollOf",
    args: [tokenId],
  });
}

export async function isPaused(tokenId: bigint): Promise<boolean> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "isPaused",
    args: [tokenId],
  });
}

export async function ownerOf(tokenId: bigint): Promise<Address> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "ownerOf",
    args: [tokenId],
  });
}

export async function totalSupply(): Promise<bigint> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "totalSupply",
  });
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------
export async function mintAgent(gene: bigint, value: bigint): Promise<Hex> {
  const client = getOperatorClient();
  return client.writeContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "mintAgent",
    args: [gene],
    value,
  });
}

export async function depositBankroll(tokenId: bigint, amount: bigint): Promise<Hex> {
  const client = getOperatorClient();
  return client.writeContract({
    address: getRegistryAddress(),
    abi: AGENT_REGISTRY_ABI,
    functionName: "depositBankroll",
    args: [tokenId, amount],
  });
}
