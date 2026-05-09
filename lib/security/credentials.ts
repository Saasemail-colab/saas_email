import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY?.trim();

  if (!secret || secret.length < 24) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must contain at least 24 characters.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptCredential(value: string) {
  const [iv, tag, encrypted] = value.split(".");

  if (!iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted credential.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
