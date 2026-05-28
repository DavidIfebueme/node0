import { NextRequest, NextResponse } from 'next/server';
import { generateOutreach, type OutreachContext } from '@/lib/glm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tone, context } = body;

    if (!tone || !context) {
      return NextResponse.json({ error: 'tone and context required' }, { status: 400 });
    }

    const outreachContext: OutreachContext = {
      breachTitle: context.breachTitle || '',
      breachCompany: context.breachCompany || '',
      breachType: context.breachType || '',
      breachSeverity: context.breachSeverity || '',
      breachDescription: context.breachDescription || '',
      vendorName: context.vendorName || '',
      prospectCompany: context.prospectCompany || '',
      prospectIndustry: context.prospectIndustry || '',
      connectionPath: context.connectionPath || '',
    };

    const result = await generateOutreach(outreachContext, tone);
    return NextResponse.json(result);
  } catch (err) {
    console.error('outreach generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 }
    );
  }
}
