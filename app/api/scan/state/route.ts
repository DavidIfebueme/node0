import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setCurrentUserId, loadScanState, getStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ breaches: [], prospects: [] });
  }

  setCurrentUserId(userId);
  await loadScanState();

  const store = getStore();
  const breaches = Array.from(store.breaches.values());
  const prospects = store.prospects;

  return NextResponse.json({
    breaches: breaches.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      severity: b.severity,
      breachType: b.breachType,
      detectedAt: b.detectedAt,
      companyId: b.companyId,
      companyName: b.companyName,
      mappedNodesCount: b.mappedNodesCount,
    })),
    prospects: prospects.map(p => ({
      id: p.id,
      companyId: p.companyId,
      companyName: p.companyName,
      industry: p.industry,
      priority: p.priority,
      relevanceScore: p.relevanceScore,
      connectionPath: p.connectionPath,
      breachId: p.breachId,
      targetVendorId: p.targetVendorId,
    })),
  });
}
