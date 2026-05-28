import { NextRequest, NextResponse } from 'next/server';
import { scanForBreachRelevance, mapVendorNetwork, findCompaniesUsingVendor, identifyProspects } from '@/lib/brightdata';
import { getStore, startScan, completeScan, resetStore, getProfile, getTargetAccounts } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const step = body.step;

  if (step === 'init') {
    resetStore();
    const scan = startScan();
    const profile = getProfile();
    const targets = getTargetAccounts();
    return NextResponse.json({
      scanId: scan.id,
      profile: { companyName: profile.companyName, industry: profile.industry },
      targetCount: targets.length,
    });
  }

  if (step === 'detect') {
    try {
      const breaches = await scanForBreachRelevance();
      return NextResponse.json({ breaches });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'detect failed' }, { status: 500 });
    }
  }

  if (step === 'map') {
    const breachId = body.breachId;
    const breach = getStore().breaches.get(breachId);
    if (!breach) return NextResponse.json({ error: 'breach not found' }, { status: 404 });

    try {
      await mapVendorNetwork(breach);

      const vendorRels = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId);
      const uniqueVendorIds = [...new Set(vendorRels.map(r => r.targetVendorId))];

      for (const vendorId of uniqueVendorIds) {
        await findCompaniesUsingVendor(vendorId);
      }

      await identifyProspects(breachId);

      const mappedNodes = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId).length;
      const storedBreach = getStore().breaches.get(breachId);
      if (storedBreach) storedBreach.mappedNodesCount = mappedNodes;

      const vendors = getStore().vendors.size;
      const prospects = getStore().prospects.filter(p => p.breachId === breachId).length;

      return NextResponse.json({ mappedNodes, vendors, prospects });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'map failed' }, { status: 500 });
    }
  }

  if (step === 'complete') {
    const breaches = getStore().breaches.size;
    const vendors = getStore().vendors.size;
    const prospects = getStore().prospects.length;

    completeScan('latest', {
      breachesFound: breaches,
      vendorsMapped: vendors,
      prospectsIdentified: prospects,
    });

    return NextResponse.json({ breaches, vendors, prospects });
  }

  return NextResponse.json({ error: 'unknown step' }, { status: 400 });
}
