import { NextRequest, NextResponse } from 'next/server';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/settings?hubspot=error', req.url));
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/crm/hubspot/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?hubspot=error', req.url));
  }

  try {
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('hubspot token exchange failed:', errText);
      return NextResponse.redirect(new URL('/settings?hubspot=error', req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, hub_id } = tokenData;

    await initDb();
    const turso = getTurso();

    const existing = await turso.execute({
      sql: "SELECT id FROM hubspot_tokens WHERE user_id = ?",
      args: ['1'],
    });

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "UPDATE hubspot_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, hub_id = ? WHERE user_id = ?",
        args: [access_token, refresh_token, Math.floor(Date.now() / 1000) + expires_in, hub_id || null, '1'],
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO hubspot_tokens (id, user_id, access_token, refresh_token, expires_at, hub_id) VALUES (?, ?, ?, ?, ?, ?)",
        args: [`hs-${Date.now()}`, '1', access_token, refresh_token, Math.floor(Date.now() / 1000) + expires_in, hub_id || null],
      });
    }

    return NextResponse.redirect(new URL('/settings?hubspot=connected', req.url));
  } catch (err) {
    console.error('hubspot oauth callback error:', err);
    return NextResponse.redirect(new URL('/settings?hubspot=error', req.url));
  }
}
