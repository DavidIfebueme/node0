import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name, company } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password, and name are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 });
  }

  const turso = getTurso();

  const existing = await turso.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'email already registered' }, { status: 409 });
  }

  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const companyName = company || '';
  const domain = companyName ? companyName.toLowerCase().replace(/\s+/g, '') + '.io' : '';
  const passwordHash = await bcrypt.hash(password, 10);

  await turso.execute({
    sql: "INSERT INTO users (id, email, name, password_hash, company_name, industry, domain) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, email, name, passwordHash, companyName, companyName ? 'Technology' : '', domain],
  });

  return NextResponse.json({ id, email, name });
}
