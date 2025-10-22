import crypto from 'crypto';

// AES-256-GCM with 12 byte IV is recommended
const algorithm = 'aes-256-gcm';
// Use an environment variable in production. Keep a deterministic key for now by hashing the secret.
const secretKey = process.env.ENCRYPTION_KEY || 'development-key-32-characters-long!';

// Derive a 32-byte key from the secretKey using SHA-256
const getKey = () => crypto.createHash('sha256').update(secretKey).digest();

export const encrypt = (text: string): string => {
  if (!text) return '';
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  const key = getKey();
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return '';

  const [ivHex, encryptedHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const key = getKey();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};