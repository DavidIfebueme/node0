import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidPipedriveToken } from '@/lib/pipedrive';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ connected: false });
  }

  const tokens = await getValidPipedriveToken(userId);
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    apiDomain: tokens.apiDomain,
  });
}
