import { NextResponse } from 'next/server';
import { getAllProspects } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const prospects = getAllProspects();
  return NextResponse.json(prospects);
}
