import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await initDb();
    const turso = getTurso();
    await turso.execute({
      sql: "DELETE FROM pipedrive_tokens WHERE user_id = ?",
      args: [userId],
    });
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error('pipedrive disconnect error:', err);
    return NextResponse.json({ error: 'failed to disconnect' }, { status: 500 });
  }
}
