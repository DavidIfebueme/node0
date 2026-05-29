import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'PIPEDRIVE_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/crm/pipedrive/callback`;

  const authUrl = new URL('https://oauth.pipedrive.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
