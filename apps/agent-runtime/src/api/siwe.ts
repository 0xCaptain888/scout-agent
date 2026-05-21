// ---------------------------------------------------------------------------
// SIWE (Sign-In with Ethereum) authentication middleware for write endpoints
// Doc ref: Section 7.3 — "All write operations require SIWE signed message"
// ---------------------------------------------------------------------------

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyMessage, getAddress, type Address } from "viem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Expected SIWE headers on every write request */
interface SiweHeaders {
  "x-siwe-message": string;
  "x-siwe-signature": string;
}

/** Parsed + verified SIWE result attached to the request */
export interface SiweAuth {
  address: Address;
  domain: string;
  issuedAt: string;
  expirationTime?: string;
  nonce: string;
}

// ---------------------------------------------------------------------------
// Lightweight SIWE message parser
//
// A full EIP-4361 message looks like:
//   ${domain} wants you to sign in with your Ethereum account:
//   ${address}
//
//   ${statement}
//
//   URI: ${uri}
//   Version: ${version}
//   Chain ID: ${chainId}
//   Nonce: ${nonce}
//   Issued At: ${issuedAt}
//   Expiration Time: ${expirationTime}     (optional)
//
// We parse the fields we care about. Full EIP-4361 libs are heavy
// (siwe npm package pulls in ethers); for a hackathon this is fine.
// ---------------------------------------------------------------------------

function parseSiweMessage(message: string): {
  address: string;
  domain: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  chainId?: string;
} {
  const lines = message.split("\n").map((l) => l.trim());

  // Line 0: "<domain> wants you to sign in..."
  const domainMatch = lines[0]?.match(/^(.+?) wants you to sign in/);
  const domain = domainMatch?.[1] || "";

  // Line 1: "0x..."
  const address = lines[1] || "";

  // Key-value fields
  const extract = (key: string): string | undefined => {
    const line = lines.find((l) => l.startsWith(`${key}: `));
    return line ? line.slice(key.length + 2) : undefined;
  };

  return {
    address,
    domain,
    nonce: extract("Nonce") || "",
    issuedAt: extract("Issued At") || "",
    expirationTime: extract("Expiration Time"),
    chainId: extract("Chain ID"),
  };
}

// ---------------------------------------------------------------------------
// Nonce store — simple in-memory for hackathon
// Production: store in Redis with TTL
// ---------------------------------------------------------------------------

const usedNonces = new Set<string>();
const NONCE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/** Generate a random nonce for the frontend to embed in its SIWE message */
export function generateNonce(): string {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return nonce;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function verifySiwe(
  message: string,
  signature: `0x${string}`,
): Promise<SiweAuth> {
  const parsed = parseSiweMessage(message);

  // 1. Validate address format
  let checksumAddress: Address;
  try {
    checksumAddress = getAddress(parsed.address);
  } catch {
    throw new Error("Invalid Ethereum address in SIWE message");
  }

  // 2. Check expiration
  if (parsed.expirationTime) {
    const expiry = new Date(parsed.expirationTime).getTime();
    if (Date.now() > expiry) {
      throw new Error("SIWE message has expired");
    }
  }

  // 3. Check issuedAt is not too old (max 10 min)
  if (parsed.issuedAt) {
    const issued = new Date(parsed.issuedAt).getTime();
    if (Date.now() - issued > NONCE_MAX_AGE_MS) {
      throw new Error("SIWE message too old (>10 minutes)");
    }
  }

  // 4. Check nonce hasn't been replayed
  if (parsed.nonce) {
    if (usedNonces.has(parsed.nonce)) {
      throw new Error("Nonce already used (replay attack)");
    }
    usedNonces.add(parsed.nonce);

    // Garbage-collect old nonces periodically (keep set bounded)
    if (usedNonces.size > 10_000) {
      usedNonces.clear();
    }
  }

  // 5. Verify signature matches the message
  const valid = await verifyMessage({
    address: checksumAddress,
    message,
    signature,
  });

  if (!valid) {
    throw new Error("SIWE signature verification failed");
  }

  return {
    address: checksumAddress,
    domain: parsed.domain,
    issuedAt: parsed.issuedAt,
    expirationTime: parsed.expirationTime,
    nonce: parsed.nonce,
  };
}

// ---------------------------------------------------------------------------
// Fastify preHandler hook
// ---------------------------------------------------------------------------

/**
 * Fastify preHandler that verifies SIWE authentication on write endpoints.
 *
 * The frontend must send two headers:
 *   x-siwe-message: <full EIP-4361 plaintext message>
 *   x-siwe-signature: <0x... signature>
 *
 * On success, sets `request.siweAuth` with the verified address.
 * On failure, returns 401.
 */
export async function requireSiwe(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const message = request.headers["x-siwe-message"] as string | undefined;
  const signature = request.headers["x-siwe-signature"] as string | undefined;

  if (!message || !signature) {
    return reply.status(401).send({
      error: "Authentication required",
      message:
        "Write endpoints require SIWE authentication. " +
        "Include x-siwe-message and x-siwe-signature headers.",
    });
  }

  try {
    const auth = await verifySiwe(message, signature as `0x${string}`);
    // Attach to request for downstream handlers
    (request as any).siweAuth = auth;
  } catch (err) {
    return reply.status(401).send({
      error: "SIWE verification failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Helper to read the verified SIWE auth from a request.
 * Returns null if not authenticated.
 */
export function getSiweAuth(request: FastifyRequest): SiweAuth | null {
  return (request as any).siweAuth || null;
}
