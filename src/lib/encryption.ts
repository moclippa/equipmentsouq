/**
 * Field-level encryption for sensitive data (bank details, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 * Key must be 32 bytes (64 hex characters) with sufficient entropy
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: openssl rand -hex 32"
    );
  }

  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
      "Generate one with: openssl rand -hex 32"
    );
  }

  // Validate hexadecimal format
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F). " +
      "Generate one with: openssl rand -hex 32"
    );
  }

  const keyBuffer = Buffer.from(key, "hex");

  // Check for weak keys (low entropy - all zeros, all same character, etc.)
  const uniqueBytes = new Set(keyBuffer);
  if (uniqueBytes.size < 8) {
    throw new Error(
      "ENCRYPTION_KEY appears to be weak (low entropy). " +
      "A secure key should have high randomness. " +
      "Generate a strong key with: openssl rand -hex 32"
    );
  }

  return keyBuffer;
}

/**
 * Encrypt a string value
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Safely encrypt a value (returns null if input is null/undefined)
 */
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

/**
 * Safely decrypt a value (returns null if input is null/undefined)
 */
export function decryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    // If decryption fails, the data might not be encrypted yet
    // This handles migration from unencrypted to encrypted data
    console.warn("Failed to decrypt value - may be unencrypted legacy data");
    return value;
  }
}

/**
 * Check if a value appears to be encrypted (has the expected format)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;

  // Check if parts are valid hex
  const hexRegex = /^[0-9a-f]+$/i;
  return parts.every((part) => hexRegex.test(part));
}

/**
 * Mask sensitive data for display (shows last 4 characters)
 * @param value - The value to mask
 * @param visibleChars - Number of characters to show at the end (default 4)
 * @returns Masked string like "****1234"
 */
export function maskSensitiveData(
  value: string | null | undefined,
  visibleChars = 4
): string {
  if (!value) return "";
  if (value.length <= visibleChars) return "*".repeat(value.length);
  return "*".repeat(value.length - visibleChars) + value.slice(-visibleChars);
}
