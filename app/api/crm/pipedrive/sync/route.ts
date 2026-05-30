import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidPipedriveToken } from '@/lib/pipedrive';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tokens = await getValidPipedriveToken(userId);
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

  const results: Array<{ company: string; status: string; detail?: string }> = [];

  for (const prospect of prospects.slice(0, 20)) {
    try {
      const orgRes = await fetch(`${baseUrl}/api/v1/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: prospect.companyName }),
      });

      const orgData = await orgRes.json();

      if (!orgRes.ok || !orgData?.success) {
        const errMsg = orgData?.error || orgData?.error_info?.message || `HTTP ${orgRes.status}`;
        console.error(`pipedrive org create failed for ${prospect.companyName}:`, errMsg);
        results.push({ company: prospect.companyName, status: 'org_create_failed', detail: errMsg });
        continue;
      }

      const orgId = orgData.data?.id;
      if (!orgId) {
        results.push({ company: prospect.companyName, status: 'org_create_failed', detail: 'no org id returned' });
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
    } catch (err) {
      console.error(`pipedrive sync error for ${prospect.companyName}:`, err);
      results.push({ company: prospect.companyName, status: 'error' });
    }
  }

  return NextResponse.json({ results });
}
