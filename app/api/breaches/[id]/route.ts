import { NextRequest, NextResponse } from 'next/server';
import { getBreachById, getVendorsForCompany, getProspectsForBreach } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const breach = getBreachById(id);
  if (!breach) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const vendors = getVendorsForCompany(breach.companyId);
  const prospects = getProspectsForBreach(breach.id);

  return NextResponse.json({
    ...breach,
    vendors: vendors.map(v => ({ ...v.vendor, confidence: v.relationship.confidence, discoveredFrom: v.relationship.discoveredFrom })),
    prospects,
  });
}
