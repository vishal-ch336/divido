import crypto from 'crypto';

/**
 * Generates a URL-safe, cryptographically-random 10-character invite code.
 * Uses Node's built-in `crypto` module — no extra dependencies needed.
 * Example output: "aB3xZ9mKq2"
 */
export const generateInviteCode = () => {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10);
};
