import { NextRequest, NextResponse } from 'next/server';
import { getProfile, getTargetAccounts, addTargetAccount, updateProfile } from '@/lib/server-store';
import type { Company } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = getProfile();
  const targets = getTargetAccounts();
  return NextResponse.json({ ...profile, targetCount: targets.length, targets });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.updateProfile) {
    updateProfile(body.updateProfile);
  }

  if (body.addTarget) {
    const target: Company = body.addTarget;
    addTargetAccount(target);
  }

  const profile = getProfile();
  const targets = getTargetAccounts();
  return NextResponse.json({ ...profile, targetCount: targets.length, targets });
}
