import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getTurso, initDb } from './turso';

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not set');
  return Buffer.from(key, 'hex');
}

function encrypt(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length > IV_LEN + TAG_LEN;
  } catch {
    return false;
  }
}

export function encryptToken(plain: string): string {
  return encrypt(plain);
}

export function decryptToken(cipher: string): string {
  if (!isEncrypted(cipher)) return cipher;
  return decrypt(cipher);
}

export async function getValidPipedriveToken(userId: string): Promise<{ accessToken: string; apiDomain: string } | null> {
  try {
    await initDb();
    const turso = getTurso();
    const result = await turso.execute({
      sql: "SELECT access_token, refresh_token, expires_at, api_domain FROM pipedrive_tokens WHERE user_id = ?",
      args: [userId],
    });
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    let accessToken = decryptToken(row.access_token as string);
    const refreshToken = decryptToken(row.refresh_token as string);
    const expiresAt = row.expires_at as number;
    let apiDomain = row.api_domain as string;

    if (expiresAt < Math.floor(Date.now() / 1000)) {
      const clientId = process.env.PIPEDRIVE_CLIENT_ID;
      const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const refreshRes = await fetch('https://oauth.pipedrive.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!refreshRes.ok) {
        console.error('pipedrive token refresh failed:', await refreshRes.text());
        return null;
      }

      const tokenData = await refreshRes.json();
      accessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token;
      const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
      if (tokenData.api_domain) apiDomain = tokenData.api_domain;

      await turso.execute({
        sql: "UPDATE pipedrive_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, api_domain = ? WHERE user_id = ?",
        args: [encrypt(accessToken), encrypt(newRefreshToken), newExpiresAt, apiDomain, userId],
      });
    }

    if (!apiDomain || !apiDomain.includes('pipedrive.com')) {
      const meRes = await fetch('https://api.pipedrive.com/v1/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      apiDomain = meData?.data?.company_domain
        ? `https://${meData.data.company_domain}.pipedrive.com`
        : 'https://api.pipedrive.com';

      await turso.execute({
        sql: "UPDATE pipedrive_tokens SET api_domain = ? WHERE user_id = ?",
        args: [apiDomain, userId],
      });
    }

    return {
      accessToken,
      apiDomain: apiDomain.replace(/\/$/, ''),
    };
  } catch (err) {
    console.error('getValidPipedriveToken error:', err);
    return null;
  }
}
