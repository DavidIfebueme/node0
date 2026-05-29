import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

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

    return {
      accessToken: row.access_token as string,
      apiDomain: (row.api_domain as string) || 'https://api.pipedrive.com',
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidToken(userId);
  if (!tokens) {
    return NextResponse.json({ error: 'pipedrive not connected or token expired' }, { status: 401 });
  }

  const body = await req.json();
  const { prospects } = body as { prospects: Array<{ companyName: string; industry: string; priority: string; breachCompany: string; breachType: string }> };

  if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
    return NextResponse.json({ error: 'no prospects provided' }, { status: 400 });
  }

  const baseUrl = tokens.apiDomain.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };

  const results: Array<{ company: string; status: string }> = [];

  for (const prospect of prospects.slice(0, 20)) {
    try {
      const orgRes = await fetch(`${baseUrl}/api/v1/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: prospect.companyName,
          ...(prospect.industry ? { [await getOrgFieldId(baseUrl, headers, 'industry')]: prospect.industry } : {}),
        }),
      });

      const orgData = await orgRes.json();
      const orgId = orgData?.data?.id;

      if (!orgId) {
        results.push({ company: prospect.companyName, status: 'org_create_failed' });
        continue;
      }

      await fetch(`${baseUrl}/api/v1/deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `[node0] ${prospect.companyName} — breach outreach (${prospect.breachCompany})`,
          org_id: orgId,
          value: prospect.priority === 'P1' ? 50000 : prospect.priority === 'P2' ? 25000 : 10000,
          currency: 'USD',
        }),
      });

      results.push({ company: prospect.companyName, status: 'synced' });
    } catch {
      results.push({ company: prospect.companyName, status: 'error' });
    }
  }

  return NextResponse.json({ results });
}

let orgFieldCache: Record<string, string> = {};

async function getOrgFieldId(baseUrl: string, headers: Record<string, string>, fieldKey: string): Promise<string> {
  if (orgFieldCache[fieldKey]) return orgFieldCache[fieldKey];
  try {
    const res = await fetch(`${baseUrl}/api/v1/organizationFields`, { headers });
    const data = await res.json();
    const field = data?.data?.find((f: { key: string }) => f.key === fieldKey);
    if (field?.id) {
      orgFieldCache[fieldKey] = String(field.id);
      return String(field.id);
    }
  } catch {}
  return fieldKey;
}
