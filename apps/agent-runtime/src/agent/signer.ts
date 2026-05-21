import crypto from "node:crypto";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { type Hex } from "viem";

const MASTER_SECRET = process.env.AGENT_MASTER_SECRET || "scout-agent-dev-secret-do-not-use-in-prod";

/**
 * Derive a deterministic private key for an agent using HKDF.
 * salt = tokenId ensures each agent gets a unique key.
 */
async function derivePrivateKey(tokenId: bigint): Promise<Hex> {
  const ikm = Buffer.from(MASTER_SECRET, "utf-8");
  const salt = Buffer.from(`agent-${tokenId.toString()}`, "utf-8");
  const info = Buffer.from("scout-agent-wallet-v1", "utf-8");

  return new Promise((resolve, reject) => {
    crypto.hkdf("sha256", ikm, salt, info, 32, (err, derivedKey) => {
      if (err) return reject(err);
      const hex = Buffer.from(derivedKey).toString("hex");
      resolve(`0x${hex}` as Hex);
    });
  });
}

/**
 * Get a viem account for an agent by tokenId.
 */
export async function getAgentWallet(tokenId: bigint): Promise<PrivateKeyAccount> {
  const privateKey = await derivePrivateKey(tokenId);
  return privateKeyToAccount(privateKey);
}

/**
 * Sign a transaction payload with the agent's derived key.
 */
export async function signTransaction(
  tokenId: bigint,
  tx: Parameters<PrivateKeyAccount["signTransaction"]>[0]
): Promise<Hex> {
  const account = await getAgentWallet(tokenId);
  return account.signTransaction(tx) as Promise<Hex>;
}
