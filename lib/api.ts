import { Breach, Prospect, Vendor } from './types';
import { MOCK_BREACHES, MOCK_PROSPECTS, getMockGraphData } from './mock-data';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

export async function getBreaches(): Promise<Breach[]> {
  if (USE_MOCK) return MOCK_BREACHES;
  const res = await fetch('/api/breaches');
  if (!res.ok) throw new Error('Failed to fetch breaches');
  return res.json();
}

export async function getBreachById(id: string): Promise<Breach | null> {
  if (USE_MOCK) return MOCK_BREACHES.find(b => b.id === id) || null;
  const res = await fetch(`/api/breaches/${id}`);
  if (!res.ok) throw new Error('Failed to fetch breach');
  return res.json();
}

export async function getProspects(): Promise<Prospect[]> {
  if (USE_MOCK) return MOCK_PROSPECTS;
  const res = await fetch('/api/prospects');
  if (!res.ok) throw new Error('Failed to fetch prospects');
  return res.json();
}

export async function getGraphData(breachId: string) {
  if (USE_MOCK) return getMockGraphData(breachId);
  const res = await fetch(`/api/graph/${breachId}`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}

export async function initiateScan(): Promise<{ scanId: string }> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { scanId: 'mock-scan-1' };
  }
  const res = await fetch('/api/scans', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to initiate scan');
  return res.json();
}

export async function generateOutreach(prospectId: string, tone: string): Promise<{ subject: string; body: string }> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const prospect = MOCK_PROSPECTS.find(p => p.id === prospectId);
    if (!prospect) throw new Error('Prospect not found');
    return {
      subject: `Vendor Risk: ${prospect.connectionPath[0].name} Exposure`,
      body: `Hi team at ${prospect.companyName},\n\nOur system (node0) detected a breach at ${prospect.connectionPath[0].name}. Your organization connects via ${prospect.connectionPath[1].name}, placing you within the blast radius.\n\nWe recommend immediate review of credentials connected to this vendor path.`,
    };
  }
  const res = await fetch('/api/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospectId, tone }),
  });
  if (!res.ok) throw new Error('Failed to generate outreach');
  return res.json();
}
