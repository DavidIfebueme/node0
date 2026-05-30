import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setCurrentUserId, loadScanState, removeBreach, saveScanState, getStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  setCurrentUserId(userId);
  await loadScanState();

  const { searchParams } = new URL(req.url);
  const breachId = searchParams.get('id');
  if (!breachId) return NextResponse.json({ error: 'breach id required' }, { status: 400 });

  removeBreach(breachId);
  await saveScanState();

  const store = getStore();
  return NextResponse.json({
    breaches: Array.from(store.breaches.values()).map(b => ({
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
    prospects: store.prospects,
  });
}
