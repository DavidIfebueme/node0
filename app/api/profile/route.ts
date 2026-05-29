import { NextRequest, NextResponse } from 'next/server';
import { turso, initDb } from '@/lib/turso';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export async function GET() {
  await ensureDb();

  const userResult = await turso.execute({
    sql: "SELECT id, email, name, company_name, industry, domain FROM users WHERE id = '1'",
    args: [],
  });

  const user = userResult.rows[0];

  const targetsResult = await turso.execute({
    sql: "SELECT id, name, domain, industry, source FROM target_accounts WHERE user_id = '1' ORDER BY created_at",
    args: [],
  });

  const targets = targetsResult.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    domain: r.domain as string,
    industry: r.industry as string,
    source: r.source as string,
  }));

  return NextResponse.json({
    userId: user?.id || '1',
    companyName: user?.company_name || 'SentinelShield',
    industry: user?.industry || 'Cybersecurity',
    domain: user?.domain || 'sentinelshield.io',
    targetCount: targets.length,
    targets,
  });
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const body = await req.json();

  if (body.updateProfile) {
    const { companyName, industry, domain } = body.updateProfile;
    await turso.execute({
      sql: "UPDATE users SET company_name = ?, industry = ?, domain = ? WHERE id = '1'",
      args: [companyName || '', industry || '', domain || ''],
    });
  }

  if (body.addTarget) {
    const target: Company = body.addTarget;
    await turso.execute({
      sql: "INSERT OR IGNORE INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, '1', ?, ?, ?, 'manual')",
      args: [target.id, target.name, target.domain || '', target.industry || 'Technology'],
    });
  }

  if (body.removeTarget) {
    await turso.execute({
      sql: "DELETE FROM target_accounts WHERE id = ? AND user_id = '1'",
      args: [body.removeTarget],
    });
  }

  if (body.csvTargets) {
    for (const t of body.csvTargets as Array<{ name: string; domain: string; industry: string }>) {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await turso.execute({
        sql: "INSERT OR IGNORE INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, '1', ?, ?, ?, 'csv')",
        args: [id, t.name, t.domain || '', t.industry || 'Technology'],
      });
    }
  }

  const targetsResult = await turso.execute({
    sql: "SELECT id, name, domain, industry, source FROM target_accounts WHERE user_id = '1' ORDER BY created_at",
    args: [],
  });

  const userResult = await turso.execute({
    sql: "SELECT company_name, industry FROM users WHERE id = '1'",
    args: [],
  });

  const user = userResult.rows[0];

  return NextResponse.json({
    companyName: user?.company_name || 'SentinelShield',
    industry: user?.industry || 'Cybersecurity',
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
