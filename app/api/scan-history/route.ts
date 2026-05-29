import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const turso = getTurso();
  const result = await turso.execute({
    sql: "SELECT id, status, breaches_found, vendors_mapped, prospects_identified, started_at, completed_at FROM scan_history WHERE user_id = ? ORDER BY started_at DESC LIMIT 20",
    args: [userId],
  });

  return NextResponse.json({
    scans: result.rows.map(r => ({
      id: r.id as string,
      status: r.status as string,
      breachesFound: r.breaches_found as number,
      vendorsMapped: r.vendors_mapped as number,
      prospectsIdentified: r.prospects_identified as number,
      startedAt: r.started_at as string,
      completedAt: r.completed_at as string | null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { status, breachesFound, vendorsMapped, prospectsIdentified, startedAt, completedAt } = body;

  const turso = getTurso();
  const id = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await turso.execute({
    sql: "INSERT INTO scan_history (id, user_id, status, breaches_found, vendors_mapped, prospects_identified, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, userId, status || 'completed', breachesFound || 0, vendorsMapped || 0, prospectsIdentified || 0, startedAt || new Date().toISOString(), completedAt || null],
  });

  return NextResponse.json({ id });
}
