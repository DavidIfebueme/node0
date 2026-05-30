import { getTurso, initDb } from './turso';

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
    let accessToken = row.access_token as string;
    const refreshToken = row.refresh_token as string;
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
      const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
      if (tokenData.api_domain) apiDomain = tokenData.api_domain;

      await turso.execute({
        sql: "UPDATE pipedrive_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, api_domain = ? WHERE user_id = ?",
        args: [accessToken, tokenData.refresh_token, newExpiresAt, apiDomain, userId],
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
