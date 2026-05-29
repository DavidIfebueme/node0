import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTurso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const search = url.searchParams.get('search')?.trim() || '';
  const offset = (page - 1) * limit;

  const turso = getTurso();

  let countSql = "SELECT COUNT(*) as total FROM target_accounts WHERE user_id = ?";
  let dataSql = "SELECT id, name, domain, industry, source FROM target_accounts WHERE user_id = ?";
  const countArgs: (string | number)[] = [userId];
  const dataArgs: (string | number)[] = [userId];

  if (search) {
    countSql += " AND (name LIKE ? OR domain LIKE ? OR industry LIKE ?)";
    dataSql += " AND (name LIKE ? OR domain LIKE ? OR industry LIKE ?)";
    const like = `%${search}%`;
    countArgs.push(like, like, like);
    dataArgs.push(like, like, like);
  }

  dataSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  dataArgs.push(limit, offset);

  const [countResult, dataResult] = await Promise.all([
    turso.execute({ sql: countSql, args: countArgs }),
    turso.execute({ sql: dataSql, args: dataArgs }),
  ]);

  const total = countResult.rows[0]?.total as number || 0;

  return NextResponse.json({
    targets: dataResult.rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      domain: r.domain as string,
      industry: r.industry as string,
      source: r.source as string,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
