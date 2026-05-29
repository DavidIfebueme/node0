import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error === 'user_denied' || !code) {
    return NextResponse.redirect(new URL('/settings?pipedrive=error', req.url));
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
  const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/crm/pipedrive/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?pipedrive=error', req.url));
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('pipedrive token exchange failed:', errText);
      return NextResponse.redirect(new URL('/settings?pipedrive=error', req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, api_domain } = tokenData;

    await initDb();
    const turso = getTurso();

    const existing = await turso.execute({
      sql: "SELECT id FROM pipedrive_tokens WHERE user_id = ?",
      args: [userId],
    });

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "UPDATE pipedrive_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, api_domain = ? WHERE user_id = ?",
        args: [access_token, refresh_token, Math.floor(Date.now() / 1000) + expires_in, api_domain || null, userId],
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO pipedrive_tokens (id, user_id, access_token, refresh_token, expires_at, api_domain) VALUES (?, ?, ?, ?, ?, ?)",
        args: [`pd-${Date.now()}`, userId, access_token, refresh_token, Math.floor(Date.now() / 1000) + expires_in, api_domain || null],
      });
    }

    return NextResponse.redirect(new URL('/settings?pipedrive=connected', req.url));
  } catch (err) {
    console.error('pipedrive oauth callback error:', err);
    return NextResponse.redirect(new URL('/settings?pipedrive=error', req.url));
  }
}
