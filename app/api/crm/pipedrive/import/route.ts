import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';
import { getValidPipedriveToken } from '@/lib/pipedrive';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidPipedriveToken(userId);
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

  const tokens = await getValidPipedriveToken(userId);
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
