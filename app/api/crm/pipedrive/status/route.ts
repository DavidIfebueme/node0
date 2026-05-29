import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ connected: false });
  }

  try {
    await initDb();
    const turso = getTurso();
    const result = await turso.execute({
      sql: "SELECT api_domain, expires_at FROM pipedrive_tokens WHERE user_id = ?",
      args: [userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const row = result.rows[0];
    const expiresAt = row.expires_at as number;
    const isExpired = expiresAt < Math.floor(Date.now() / 1000);

    return NextResponse.json({
      connected: !isExpired,
      apiDomain: row.api_domain,
      expired: isExpired,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
