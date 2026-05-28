import { NextRequest, NextResponse } from 'next/server';
import { getProspectById, getBreachById, addOutreach, getOutreachForProspect } from '@/lib/server-store';
import { generateOutreach, type OutreachContext } from '@/lib/glm';

export async function POST(req: NextRequest) {
  try {
    const { prospectId, tone } = await req.json();
    if (!prospectId || !tone) {
      return NextResponse.json({ error: 'prospectId and tone required' }, { status: 400 });
    }

    const prospect = getProspectById(prospectId);
    if (!prospect) {
      return NextResponse.json({ error: 'prospect not found' }, { status: 404 });
    }

    const existing = getOutreachForProspect(prospectId);
    if (existing) {
      return NextResponse.json({ subject: existing.subject, body: existing.body });
    }

    const breach = getBreachById(prospect.breachId);
    if (!breach) {
      return NextResponse.json({ error: 'breach not found' }, { status: 404 });
    }

    const vendorName = prospect.connectionPath[1]?.name || 'Unknown Vendor';
    const connectionPath = prospect.connectionPath.map(p => `${p.type}: ${p.name}`).join(' → ');

    const context: OutreachContext = {
      breachTitle: breach.title,
      breachCompany: breach.companyName,
      breachType: breach.breachType,
      breachSeverity: breach.severity,
      breachDescription: breach.description,
      vendorName,
      prospectCompany: prospect.companyName,
      prospectIndustry: prospect.industry,
      connectionPath,
    };

    const result = await generateOutreach(context, tone);

    addOutreach({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prospectId,
      subject: result.subject,
      body: result.body,
      tone,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('outreach generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 }
    );
  }
}
