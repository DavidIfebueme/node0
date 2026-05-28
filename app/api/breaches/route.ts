import { NextResponse } from 'next/server';
import { getAllBreaches } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const breaches = getAllBreaches();
  return NextResponse.json(breaches);
}
