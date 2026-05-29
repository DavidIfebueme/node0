import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso, initDb } from '@/lib/turso';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const turso = getTurso();

  const userResult = await turso.execute({
    sql: "SELECT id, email, name, company_name, industry, domain FROM users WHERE id = ?",
    args: [userId],
  });

  const user = userResult.rows[0];

  const targetsResult = await turso.execute({
    sql: "SELECT id, name, domain, industry, source FROM target_accounts WHERE user_id = ? ORDER BY created_at",
    args: [userId],
  });

  const targets = targetsResult.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    domain: r.domain as string,
    industry: r.industry as string,
    source: r.source as string,
  }));

  return NextResponse.json({
    userId,
    companyName: user?.company_name || '',
    industry: user?.industry || '',
    domain: user?.domain || '',
    targetCount: targets.length,
    targets,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const turso = getTurso();
  const body = await req.json();

  if (body.updateProfile) {
    const { companyName, industry, domain } = body.updateProfile;
    await turso.execute({
      sql: "UPDATE users SET company_name = ?, industry = ?, domain = ? WHERE id = ?",
      args: [companyName || '', industry || '', domain || '', userId],
    });
  }

  if (body.addTarget) {
    const target: Company = body.addTarget;
    await turso.execute({
      sql: "INSERT OR IGNORE INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, ?, ?, ?, ?, 'manual')",
      args: [target.id, userId, target.name, target.domain || '', target.industry || 'Technology'],
    });
  }

  if (body.removeTarget) {
    await turso.execute({
      sql: "DELETE FROM target_accounts WHERE id = ? AND user_id = ?",
      args: [body.removeTarget, userId],
    });
  }

  if (body.updateTarget) {
    const { id, name, domain, industry } = body.updateTarget;
    await turso.execute({
      sql: "UPDATE target_accounts SET name = ?, domain = ?, industry = ? WHERE id = ? AND user_id = ?",
      args: [name, domain || '', industry || 'Technology', id, userId],
    });
  }

  if (body.csvTargets) {
    for (const t of body.csvTargets as Array<{ name: string; domain: string; industry: string }>) {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await turso.execute({
        sql: "INSERT OR IGNORE INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, ?, ?, ?, ?, 'csv')",
        args: [id, userId, t.name, t.domain || '', t.industry || 'Technology'],
      });
    }
  }

  const targetsResult = await turso.execute({
    sql: "SELECT id, name, domain, industry, source FROM target_accounts WHERE user_id = ? ORDER BY created_at",
    args: [userId],
  });

  const userResult = await turso.execute({
    sql: "SELECT company_name, industry FROM users WHERE id = ?",
    args: [userId],
  });

  const user = userResult.rows[0];

  return NextResponse.json({
    companyName: user?.company_name || '',
    industry: user?.industry || '',
    targetCount: targetsResult.rows.length,
    targets: targetsResult.rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      domain: r.domain as string,
      industry: r.industry as string,
      source: r.source as string,
    })),
  });
}
