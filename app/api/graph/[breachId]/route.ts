import { NextRequest, NextResponse } from 'next/server';
import { getGraphData } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ breachId: string }> }
) {
  const { breachId } = await params;
  const data = getGraphData(breachId);
  return NextResponse.json(data);
}
