import { Breach, Prospect } from './types';

export async function getBreaches(): Promise<Breach[]> {
  const res = await fetch('/api/breaches');
  if (!res.ok) throw new Error('Failed to fetch breaches');
  return res.json();
}

export async function getBreachById(id: string): Promise<Breach | null> {
  const res = await fetch(`/api/breaches/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getProspects(): Promise<Prospect[]> {
  const res = await fetch('/api/prospects');
  if (!res.ok) throw new Error('Failed to fetch prospects');
  return res.json();
}

export async function getGraphData(breachId: string) {
  const res = await fetch(`/api/graph/${breachId}`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}

export async function getProfile() {
  const res = await fetch('/api/profile');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function scanInit() {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'init' }),
  });
  if (!res.ok) throw new Error('Scan init failed');
  return res.json();
}

export async function scanDetect() {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'detect' }),
  });
  if (!res.ok) throw new Error('Scan detect failed');
  return res.json();
}

export async function scanMap(breachId: string) {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'map', breachId }),
  });
  if (!res.ok) throw new Error('Scan map failed');
  return res.json();
}

export async function scanComplete() {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'complete' }),
  });
  if (!res.ok) throw new Error('Scan complete failed');
  return res.json();
}

export async function generateOutreach(prospectId: string, tone: string): Promise<{ subject: string; body: string }> {
  const res = await fetch('/api/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospectId, tone }),
  });
  if (!res.ok) throw new Error('Failed to generate outreach');
  return res.json();
}
