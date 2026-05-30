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

  const baseUrl = tokens.apiDomain;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };

  console.log(`pipedrive sync: pushing ${prospects.length} prospects to ${baseUrl}`);

  const results: Array<{ company: string; status: string; detail?: string }> = [];

  for (const prospect of prospects.slice(0, 20)) {
    try {
      const orgPayload: Record<string, unknown> = { name: prospect.companyName };

      const orgRes = await fetch(`${baseUrl}/api/v1/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orgPayload),
      });

      const orgData = await orgRes.json();

      if (!orgRes.ok || !orgData?.success) {
        const errMsg = orgData?.error || orgData?.error_info?.message || `HTTP ${orgRes.status}`;
        console.error(`pipedrive org create failed for ${prospect.companyName}:`, errMsg, JSON.stringify(orgData));
        results.push({ company: prospect.companyName, status: 'org_create_failed', detail: errMsg });
        continue;
      }

      const orgId = orgData.data?.id;
      if (!orgId) {
        results.push({ company: prospect.companyName, status: 'org_create_failed', detail: 'no org id returned' });
        continue;
      }

      const dealRes = await fetch(`${baseUrl}/api/v1/deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `[node0] ${prospect.companyName} — breach outreach (${prospect.breachCompany})`,
          org_id: orgId,
          value: prospect.priority === 'P1' ? 50000 : prospect.priority === 'P2' ? 25000 : 10000,
          currency: 'USD',
        }),
      });

      if (!dealRes.ok) {
        const dealErr = await dealRes.text();
        console.error(`pipedrive deal create failed for ${prospect.companyName}:`, dealErr);
      }

      results.push({ company: prospect.companyName, status: 'synced' });
    } catch (err) {
      console.error(`pipedrive sync error for ${prospect.companyName}:`, err);
      results.push({ company: prospect.companyName, status: 'error' });
    }
  }

  return NextResponse.json({ results });
}
