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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

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
- companyName: the specific company that was breached (proper name, e.g. "Snowflake", "Okta"). Never return generic words like "top", "mobile", "various", "multiple".
- breachType: MUST be exactly one of: RANSOMWARE, CREDENTIAL_THEFT, SUPPLY_CHAIN, DATA_EXFILTRATION, ZERO_DAY, INSIDER_THREAT, MISCONFIGURATION, DATA_LEAK, VULNERABILITY, CREDENTIAL_EXPOSURE, THIRD_PARTY
- severity: MUST be exactly one of: CRITICAL, HIGH, MEDIUM, LOW
- description: 1-2 sentence factual summary of what happened
- affectedVendors: array of specific vendor/product names involved (e.g. ["AWS", "Okta", "Salesforce"]). Use empty array if none found.
- affectedCompanies: array of specific company names affected. Use empty array if none found.

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
    const rawVendors = parsed.affectedVendors;
    const vendorList = Array.isArray(rawVendors) ? rawVendors : (typeof rawVendors === 'string' && rawVendors ? rawVendors.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const rawCompanies = parsed.affectedCompanies;
    const companyList = Array.isArray(rawCompanies) ? rawCompanies : (typeof rawCompanies === 'string' && rawCompanies ? rawCompanies.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const rawSeverity = String(parsed.severity || 'MEDIUM').toUpperCase().trim();
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const severity = validSeverities.includes(rawSeverity) ? rawSeverity : 'MEDIUM';
    const rawBreachType = String(parsed.breachType || 'DATA_LEAK').toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '');
    const validBreachTypes = ['RANSOMWARE', 'CREDENTIAL_EXPOSURE', 'VULNERABILITY', 'THIRD_PARTY', 'INSIDER_THREAT', 'DATA_LEAK', 'DATA_EXFILTRATION', 'SUPPLY_CHAIN', 'ZERO_DAY', 'MISCONFIGURATION', 'CREDENTIAL_THEFT'];
    const breachType = validBreachTypes.includes(rawBreachType) ? rawBreachType : 'DATA_LEAK';
    return {
      companyName: parsed.companyName || 'Unknown',
      breachType,
      severity,
      description: parsed.description || '',
      affectedVendors: vendorList,
      affectedCompanies: companyList,
    };
  } catch (err) {
    console.error('extractBreachData JSON parse failed:', err instanceof Error ? err.message : err, '\nRaw content:', content.slice(0, 300));
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
