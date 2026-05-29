const AIML_API_URL = 'https://api.aimlapi.com/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
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

export interface BreachExtraction {
  companyName: string;
  breachType: string;
  severity: string;
  description: string;
  affectedVendors: string[];
  affectedCompanies: string[];
}

async function aimlChat(messages: ChatMessage[], temperature: number = 0.6, maxTokens: number = 800): Promise<string> {
  const apiKey = process.env.AIML_API_KEY;
  if (!apiKey) throw new Error('AIML_API_KEY not configured');

  const response = await fetch(AIML_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'zhipu/glm-4.5-air',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AIML API error: ${response.status} - ${errorText}`);
  }

  const data: ChatResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AIML API returned empty response');
  return content;
}

export async function generateOutreach(
  context: OutreachContext,
  tone: 'professional' | 'urgent' | 'casual'
): Promise<{ subject: string; body: string }> {
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

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const content = await aimlChat(messages, tone === 'casual' ? 0.8 : tone === 'urgent' ? 0.5 : 0.6);

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

export async function extractBreachData(articleText: string): Promise<BreachExtraction> {
  const systemPrompt = `You are a cybersecurity intelligence analyst. Extract structured breach data from the given article text. Return a JSON object with exactly these fields:
- companyName: the company that was breached
- breachType: type of breach (e.g. DATA_EXFILTRATION, RANSOMWARE, SUPPLY_CHAIN, CREDENTIAL_THEFT, ZERO_DAY, INSIDER_THREAT, MISCONFIGURATION)
- severity: one of CRITICAL, HIGH, MEDIUM, LOW
- description: 1-2 sentence summary of what happened
- affectedVendors: array of vendor/product names that are involved or affected (e.g. cloud providers, SaaS tools, security tools mentioned)
- affectedCompanies: array of company names mentioned as affected

No markdown, no code fences, just raw JSON.`;

  const userPrompt = `Extract breach data from this article:\n\n${articleText}`;

  const content = await aimlChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.3,
    1000
  );

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      companyName: parsed.companyName || 'Unknown',
      breachType: parsed.breachType || 'DATA_EXFILTRATION',
      severity: parsed.severity || 'MEDIUM',
      description: parsed.description || '',
      affectedVendors: Array.isArray(parsed.affectedVendors) ? parsed.affectedVendors : [],
      affectedCompanies: Array.isArray(parsed.affectedCompanies) ? parsed.affectedCompanies : [],
    };
  } catch {
    return {
      companyName: 'Unknown',
      breachType: 'DATA_EXFILTRATION',
      severity: 'MEDIUM',
      description: content.slice(0, 200),
      affectedVendors: [],
      affectedCompanies: [],
    };
  }
}
