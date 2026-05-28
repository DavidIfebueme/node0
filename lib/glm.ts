const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface OutreachContext {
  breachTitle: string;
  breachCompany: string;
  breachType: string;
  breachSeverity: string;
  breachDescription: string;
  vendorName: string;
  prospectCompany: string;
  prospectIndustry: string;
  connectionPath: string;
}

export async function generateOutreach(
  context: OutreachContext,
  tone: 'professional' | 'urgent' | 'casual'
): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error('ZAI_API_KEY not configured');

  const systemPrompt = `You are node0, an AI-powered cybersecurity outreach system. You generate targeted sales outreach emails for cybersecurity vendors. The emails inform prospects that they are within the blast radius of a security breach because they share a vendor with the breached company. Be specific about the breach and vendor connection. Keep emails concise and actionable. Always output a JSON object with "subject" and "body" fields. No markdown, no code fences, just raw JSON.`;

  const toneInstructions: Record<string, string> = {
    professional: 'Write in a professional, consultative tone. Position node0 as a strategic partner offering visibility into vendor risk.',
    urgent: 'Write with urgency. Emphasize the live threat and need for immediate action. Use strong language about exposure windows.',
    casual: 'Write in a friendly, approachable tone. Like a colleague giving a heads-up. Keep it brief and conversational.',
  };

  const userPrompt = `Generate a ${tone} outreach email with the following context:

BREACH: ${context.breachTitle}
BREACHED COMPANY: ${context.breachCompany}
BREACH TYPE: ${context.breachType}
SEVERITY: ${context.breachSeverity}
DESCRIPTION: ${context.breachDescription}
SHARED VENDOR: ${context.vendorName}
PROSPECT COMPANY: ${context.prospectCompany}
PROSPECT INDUSTRY: ${context.prospectIndustry}
CONNECTION: ${context.connectionPath}

TONE: ${toneInstructions[tone]}

Return ONLY a JSON object with "subject" and "body" fields.`;

  const messages: GLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-plus',
      messages,
      temperature: tone === 'casual' ? 0.8 : tone === 'urgent' ? 0.5 : 0.6,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${errorText}`);
  }

  const data: GLMResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('GLM API returned empty response');

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      subject: parsed.subject || `Vendor Risk: ${context.breachCompany} Exposure`,
      body: parsed.body || content,
    };
  } catch {
    const lines = content.split('\n');
    const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject'));
    const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : `Vendor Risk: ${context.breachCompany} Exposure`;
    const body = lines.filter(l => !l.toLowerCase().startsWith('subject')).join('\n').trim();
    return { subject, body };
  }
}
