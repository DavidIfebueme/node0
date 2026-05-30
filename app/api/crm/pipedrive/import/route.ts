import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

const SEED_ORGS = [
  { name: 'Stripe', industry: 'Fintech' },
  { name: 'Shopify', industry: 'E-Commerce' },
  { name: 'Slack', industry: 'SaaS' },
  { name: 'Datadog', industry: 'Observability' },
  { name: 'Snowflake', industry: 'Data Warehouse' },
  { name: 'CrowdStrike', industry: 'Cybersecurity' },
  { name: 'Twilio', industry: 'Communications' },
  { name: 'Okta', industry: 'Identity' },
  { name: 'Atlassian', industry: 'Collaboration' },
  { name: 'Salesforce', industry: 'CRM' },
];

async function getValidToken(userId: string): Promise<{ accessToken: string; apiDomain: string } | null> {
  try {
    await initDb();
    const turso = getTurso();
    const result = await turso.execute({
      sql: "SELECT access_token, refresh_token, expires_at, api_domain FROM pipedrive_tokens WHERE user_id = ?",
      args: [userId],
    });
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const expiresAt = row.expires_at as number;
    if (expiresAt < Math.floor(Date.now() / 1000)) return null;

    let apiDomain = row.api_domain as string;
    if (!apiDomain || !apiDomain.includes('pipedrive.com')) {
      const meRes = await fetch('https://api.pipedrive.com/v1/users/me', {
        headers: { 'Authorization': `Bearer ${row.access_token}` },
      });
      const meData = await meRes.json();
      apiDomain = meData?.data?.company_domain
        ? `https://${meData.data.company_domain}.pipedrive.com`
        : 'https://api.pipedrive.com';
    }

    return {
      accessToken: row.access_token as string,
      apiDomain: apiDomain.replace(/\/$/, ''),
    };
  } catch (err) {
    console.error('getValidToken error:', err);
    return null;
  }
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidToken(userId);
  if (!tokens) {
    return NextResponse.json({ error: 'pipedrive not connected or token expired' }, { status: 401 });
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${tokens.apiDomain}/api/v1/organizations?limit=100&sort=add_time DESC`, { headers });
    const data = await res.json();
    const orgs: Array<{ id: string; name: string }> = [];

    if (data?.data && Array.isArray(data.data)) {
      for (const org of data.data) {
        orgs.push({ id: String(org.id), name: org.name || 'Unknown' });
      }
    }

    return NextResponse.json({ organizations: orgs, total: orgs.length });
  } catch (err) {
    console.error('pipedrive import error:', err);
    return NextResponse.json({ error: 'failed to fetch organizations' }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidToken(userId);
  if (!tokens) {
    return NextResponse.json({ error: 'pipedrive not connected or token expired' }, { status: 401 });
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${tokens.apiDomain}/api/v1/organizations?limit=100&sort=add_time DESC`, { headers });
    const data = await res.json();

    if (!data?.data || !Array.isArray(data.data)) {
      return NextResponse.json({ error: 'no organizations found' }, { status: 404 });
    }

    await initDb();
    const turso = getTurso();
    let imported = 0;

    for (const org of data.data) {
      const name = org.name;
      if (!name) continue;

      const existing = await turso.execute({
        sql: "SELECT id FROM target_accounts WHERE user_id = ? AND LOWER(name) = LOWER(?)",
        args: [userId, name],
      });
      if (existing.rows.length > 0) continue;

      const id = `pd-${org.id}-${Date.now()}`;
      await turso.execute({
        sql: "INSERT OR IGNORE INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, ?, ?, ?, ?, 'pipedrive')",
        args: [id, userId, name, '', ''],
      });
      imported++;
    }

    return NextResponse.json({ imported, total: data.data.length });
  } catch (err) {
    console.error('pipedrive import error:', err);
    return NextResponse.json({ error: 'import failed' }, { status: 500 });
  }
}

export async function PUT() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidToken(userId);
  if (!tokens) {
    return NextResponse.json({ error: 'pipedrive not connected or token expired' }, { status: 401 });
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };

  let created = 0;

  for (const org of SEED_ORGS) {
    try {
      const res = await fetch(`${tokens.apiDomain}/api/v1/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: org.name, industry: org.industry }),
      });
      const data = await res.json();
      if (res.ok && data?.success) created++;
      else console.error(`seed org failed for ${org.name}:`, JSON.stringify(data));
    } catch (err) {
      console.error(`seed org error for ${org.name}:`, err);
    }
  }

  return NextResponse.json({ created, total: SEED_ORGS.length });
}
