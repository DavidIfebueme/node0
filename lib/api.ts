export async function generateOutreach(context: {
  breachTitle: string;
  breachCompany: string;
  breachType: string;
  breachSeverity: string;
  breachDescription: string;
  vendorName: string;
  prospectCompany: string;
  prospectIndustry: string;
  connectionPath: string;
}, tone: string): Promise<{ subject: string; body: string }> {
  const res = await fetch('/api/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone, context }),
  });
  if (!res.ok) throw new Error('Failed to generate outreach');
  return res.json();
}

export async function getProfile() {
  const res = await fetch('/api/profile');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}
