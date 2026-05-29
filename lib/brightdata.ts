import { bdclient, type DiscoverResultItem } from '@brightdata/sdk';
import {
  addBreach, addRelationship, addProspect,
  getOrCreateCompany, getOrCreateVendor, getTargetAccounts, getStore, getProfile,
} from './server-store';
import { extractBreachData } from './glm';
import type { Breach, Severity, BreachType } from './types';

let client: bdclient | null = null;

function getClient(): bdclient {
  if (!client) {
    client = new bdclient({
      apiKey: process.env.BRIGHT_DATA_API_KEY!,
      autoCreateZones: true,
      logLevel: 'ERROR',
    });
  }
  return client;
}

function generateBreachId(): string {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function classifySeverity(description: string, title: string): Severity {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('critical') || text.includes('ransomware') || text.includes('zero-day') || text.includes('supply chain')) return 'CRITICAL';
  if (text.includes('high') || text.includes('data leak') || text.includes('exposure') || text.includes('millions')) return 'HIGH';
  if (text.includes('medium') || text.includes('phishing') || text.includes('credential')) return 'MEDIUM';
  return 'LOW';
}

function classifyBreachType(description: string, title: string): BreachType {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('ransomware') || text.includes('malware')) return 'RANSOMWARE';
  if (text.includes('credential') || text.includes('password') || text.includes('phishing')) return 'CREDENTIAL_EXPOSURE';
  if (text.includes('vulnerability') || text.includes('zero-day') || text.includes('cve')) return 'VULNERABILITY';
  if (text.includes('third party') || text.includes('supply chain') || text.includes('vendor')) return 'THIRD_PARTY';
  if (text.includes('insider') || text.includes('employee')) return 'INSIDER_THREAT';
  return 'DATA_LEAK';
}

const HEADLINE_GARBAGE = new Set([
  'The','This','That','These','Those','Biggest','Largest','Major','Recent','New','Latest',
  'April','May','June','July','August','September','October','November','December',
  'January','February','March','Were','Was','Has','Have','Had','Are','Is','More',
  'Over','About','How','Why','What','When','Where','Who','Which','Their','Our','Your',
  'Millions','Thousands','Hundreds','Several','Multiple','Many','Some','All','Most',
  'Other','Another','First','Last','Next','Former','After','Before','During','Following',
  'According','Based','Data','Security','Cyber','Breached','Hacked','Attacked',
  'Compromised','Forced','Reported','Confirmed','Companies','Must','Disclose',
  'People','Users','Customers','Vendor','Firm','Company','Healthcare','Provider',
  'Government','Agency','Organization','Third','Party','Supply','Chain',
  'US','UK','EU','World','Global','National','State','Federal','Local','Public',
  'Private','Online','Digital','Tech','Info','Group','Inc','Corp','Ltd','LLC',
  'Reveals','Revealed','Discloses','Disclosed','Says','Announces','Announced',
  'Internal','External','Attack','Attacks','Hack','Hacks','Breach','Breaches',
  'Leak','Leaks','Alert','Warning','Threat','Threats','Vulnerability','Vulnerabilities',
  'And','Or','But','Not','No','Yes','Just','Only','Also','Still','Already','Even',
  'Since','Because','While','Although','Despite','However','Moreover','Furthermore',
  'Here','There','Now','Then','Today','Yesterday','Tomorrow','Week','Month','Year',
]);

function cleanExtractedName(raw: string): string | null {
  let name = raw.trim();
  name = name.replace(/\s+(Reveals?|Discloses?|Says|Announces?|Reports?|Confirms?|Internal|External|Incident|Attack|Hack|Breach|Leak|Vulnerability|Warning|Alert|Threat|Suffered|Confirmed|Reported|Disclosed|Announced|Was|Has|Had|Is|Got|Data|Customer|User|Employee)$/i, '');
  name = name.replace(/^(Reveals?|Discloses?|Says|Announces?|Reports?|Confirms?|Internal|External|Attack|Hack|Breach|Leak|Cyber|Security|Data|New|Major|Recent|Latest)\s+/i, '');
  const words = name.split(/\s+/);
  if (words.some(w => HEADLINE_GARBAGE.has(w))) return null;
  if (name.length < 3) return null;
  if (/^[a-z]/.test(name)) return null;
  if (/\d{4}/.test(name)) return null;
  if (/^(and|or|the|a|an|of|in|on|at|to|for|with|by|from|up|into|through)\b/i.test(name)) return null;
  return name;
}

function extractCompanyNameFromResult(item: DiscoverResultItem): string | null {
  const text = `${item.title} ${item.description}`;
  const patterns = [
    /(?:breach(?:ed)?\s+(?:at|by|on|in|of)\s+|attack(?:ed)?\s+(?:on|at)\s+|hack(?:ed)?\s+(?:at|on|of)\s+|incident\s+(?:at|on|involving)\s+|compromised\s+(?:at|by)\s+)([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})\s+(?:suffered|confirmed|reported|disclosed|announced|revealed)\s+(?:a\s+)?(?:data\s+)?(?:breach|leak|hack|attack|incident|compromise)/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})\s+(?:was|has been|had been|is|got)\s+(?:breached|hacked|compromised|attacked|hit|impacted|affected)/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})\s+(?:data|customer|user|employee)\s+(?:breach|leak|exposure|theft)/i,
    /(?:data\s+breach|cyber\s+attack|security\s+incident|ransomware\s+attack)\s+(?:at|on|hits|targets|affects|impacts)\s+([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})\s+(?:says|confirms|reports)\s+(?:data\s+)?(?:breach|leak|hack)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = cleanExtractedName(match[1].trim());
      if (cleaned) return cleaned;
    }
  }
  const knownCompanies = [
    'Snowflake','Okta','SolarWinds','Salesforce','Stripe','Shopify','Slack','Datadog',
    'CrowdStrike','Twilio','Atlassian','HubSpot','PagerDuty','MongoDB','Elastic',
    'Cloudflare','Zscaler','Palo Alto Networks','Fortinet','ServiceNow','Workday','Zoom',
    'Dropbox','LastPass','MoveIT','Citrix','VMware','Cisco','Juniper','Norton',
    'T-Mobile','AT&T','Verizon','Equifax','Capital One','Home Depot',
    'Marriott','Yahoo','LinkedIn','Adobe','Sony','Uber','Facebook',
    'Google','Microsoft','Apple','Amazon','Netflix','Spotify','Meta',
    'Ticketmaster','Change Healthcare','Ascension','Fidelity','Fiserv',
    'Broadcom','SAP','Oracle','IBM','HP','Dell','Lenovo','Samsung','Intel','AMD',
    'NVIDIA','Qualcomm',
  ];
  for (const company of knownCompanies) {
    const regex = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) return company;
  }
  return null;
}

export interface ScanProgressCallback {
  (stage: string, detail: string): void;
}

const REPORT_PATTERNS = [
  /cost of a data breach/i,
  /threat landscape report/i,
  /global threat report/i,
  /annual security report/i,
  /cybersecurity report/i,
  /security report\s+\d{4}/i,
  /state of .*(security|cyber|threat)/i,
  /trends? report/i,
  /industry report/i,
  /research report/i,
  /market report/i,
  /insights? report/i,
  /intelligence report/i,
  /\breport\b.*\breveals?\b/i,
  /\breveals?\b.*\breport\b/i,
  /top\s+\d+\s+(data breach|cyber|security|threat)/i,
  /best practices/i,
  /whitepaper/i,
  /white paper/i,
  /e-?book/i,
  /webinar/i,
  /survey\s+(of|find|result)/i,
  /statistics/i,
  /infographic/i,
];

const REPORT_KEYWORDS = new Set([
  'report', 'reports', 'research', 'study', 'survey', 'analysis',
  'whitepaper', 'overview', 'guide', 'handbook', 'framework',
  'statistics', 'benchmark', 'index', 'ranking', 'scorecard',
  'outlook', 'forecast', 'predictions', 'trends', 'insights',
]);

function isReportNotBreach(title: string, description: string): boolean {
  const text = `${title} ${description}`;
  for (const pattern of REPORT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  const words = text.toLowerCase().split(/\s+/);
  let reportHits = 0;
  for (const w of words) {
    if (REPORT_KEYWORDS.has(w)) reportHits++;
  }
  if (reportHits >= 2) return true;
  return false;
}

function parseSerpBodyRaw(body: string): DiscoverResultItem[] {
  const items: DiscoverResultItem[] = [];
  const blocks = body.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;
    const titleLine = lines[0].replace(/^\d+\.\s*/, '').replace(/\*+/g, '').trim();
    const descLines = lines.slice(1).join(' ').replace(/\*+/g, '').trim();
    if (titleLine.length < 10) continue;
    items.push({
      title: titleLine.slice(0, 200),
      description: descLines.slice(0, 500),
      link: '',
      relevance_score: 0.5,
    });
  }
  return items.slice(0, 15);
}

function parseSerpBody(body: string): DiscoverResultItem[] {
  return parseSerpBodyRaw(body).filter(
    item => !isReportNotBreach(item.title, item.description)
  );
}

export async function scanForBreachRelevance(onProgress?: ScanProgressCallback, targetIds?: string[] | null): Promise<Breach[]> {
  const c = getClient();
  const profile = await getProfile();
  let targets = await getTargetAccounts();

  if (targetIds && targetIds.length > 0) {
    targets = targets.filter(t => targetIds.includes(t.id));
  }
  const breaches: Breach[] = [];

  onProgress?.('detect', `scanning for breaches relevant to ${profile.companyName}'s ${targets.length} target accounts...`);

  const targetNames = targets.slice(0, 6).map(t => t.name);
  const queries = [
    `data breach 2025 2026 ${targetNames.slice(0, 3).join(' OR ')}`,
    `cybersecurity incident ransomware hack ${targetNames.slice(3, 6).join(' OR ')}`,
    'major data breach cyber attack company 2025 2026',
    'supply chain attack third party vendor compromise 2025 2026',
    'credential leak data exposure hack breach enterprise',
  ];

  onProgress?.('detect', 'running 5 discovery queries...');
  const liveResults = await Promise.allSettled(
    queries.map(query =>
      c.discover(query, {
        intent: `security breaches, cyber incidents, data leaks, and ransomware attacks affecting companies — especially relevant to ${profile.industry} vendors and their customers`,
        includeContent: false,
        numResults: 10,
      })
    )
  );

  onProgress?.('detect', 'running SERP news search...');
  let serpResults: PromiseSettledResult<{ body?: string }>[] = [];
  try {
    serpResults = await Promise.allSettled([
      c.search.google('data breach 2026 company hack ransomware', { format: 'json', dataFormat: 'markdown' }),
    ]);
  } catch {
    onProgress?.('detect', 'SERP search skipped (timeout)');
  }

  const candidateItems: { item: DiscoverResultItem; companyName: string }[] = [];

  for (const result of liveResults) {
    if (result.status !== 'fulfilled' || !result.value.success || !result.value.data) continue;
    for (const item of result.value.data) {
      if (item.relevance_score < 0.25) continue;
      if (isReportNotBreach(item.title, item.description)) continue;
      const companyName = extractCompanyNameFromResult(item);
      if (!companyName) continue;
      const existingBreach = Array.from(getStore().breaches.values()).find(
        b => b.companyName.toLowerCase() === companyName.toLowerCase()
      ) || breaches.find(b => b.companyName.toLowerCase() === companyName.toLowerCase());
      if (existingBreach) continue;
      if (candidateItems.length >= 8) break;
      if (!candidateItems.some(c => c.companyName.toLowerCase() === companyName.toLowerCase())) {
        candidateItems.push({ item, companyName });
      }
    }
    if (candidateItems.length >= 8) break;
  }

  for (const result of serpResults) {
    if (result.status !== 'fulfilled') continue;
    const body = (result.value as { body?: string })?.body;
    if (!body) continue;
    const serpEntries = parseSerpBody(body);
    for (const entry of serpEntries) {
      const companyName = extractCompanyNameFromResult(entry);
      if (!companyName) continue;
      if (isReportNotBreach(entry.title, entry.description)) continue;
      if (candidateItems.some(c => c.companyName.toLowerCase() === companyName.toLowerCase())) continue;
      if (breaches.find(b => b.companyName.toLowerCase() === companyName.toLowerCase())) continue;
      if (candidateItems.length >= 8) break;
      candidateItems.push({ item: entry, companyName });
    }
  }

  const aiCandidates = candidateItems.slice(0, 5);
  onProgress?.('detect', `analyzing ${aiCandidates.length} breach reports with AI...`);

  const aiResults = await Promise.allSettled(
    aiCandidates.map(async ({ item, companyName }) => {
      onProgress?.('detect', `analyzing: ${companyName}...`);
      try {
        const articleText = `TITLE: ${item.title}\n\n${item.description}`;
        const extraction = await extractBreachData(articleText);
        return { item, companyName, extraction, aiSuccess: true };
      } catch {
        return { item, companyName, extraction: null, aiSuccess: false };
      }
    })
  );

  for (const result of aiResults) {
    if (result.status !== 'fulfilled') continue;
    const { item, companyName: regexName, extraction, aiSuccess } = result.value;
    const companyName = extraction?.companyName && extraction.companyName !== 'Unknown' ? extraction.companyName : regexName;
    const breachDescription = (aiSuccess && extraction?.description) ? extraction.description : item.description;
    if (isReportNotBreach(item.title, breachDescription)) {
      onProgress?.('detect', `skipped: ${companyName} (report/research, not a breach)`);
      continue;
    }
    const existingBreach = breaches.find(b => b.companyName.toLowerCase() === companyName.toLowerCase());
    if (existingBreach) continue;
    if (breaches.length >= 5) break;

    const company = getOrCreateCompany(companyName, `${companyName.toLowerCase().replace(/\s+/g, '')}.com`, 'Technology');
    const severity = (aiSuccess && extraction && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(extraction.severity) ? extraction.severity : classifySeverity(item.description, item.title)) as Severity;
    const breachType = (aiSuccess && extraction && [ 'RANSOMWARE', 'CREDENTIAL_EXPOSURE', 'VULNERABILITY', 'THIRD_PARTY', 'INSIDER_THREAT', 'DATA_LEAK', 'DATA_EXFILTRATION', 'SUPPLY_CHAIN', 'ZERO_DAY', 'MISCONFIGURATION', 'CREDENTIAL_THEFT' ].includes(extraction.breachType) ? extraction.breachType : classifyBreachType(item.description, item.title)) as BreachType;

    const breach: Breach = {
      id: generateBreachId(),
      title: item.title.length > 200 ? item.title.slice(0, 197) + '...' : item.title,
      description: (aiSuccess && extraction?.description) ? extraction.description : (item.description.length > 500 ? item.description.slice(0, 497) + '...' : item.description),
      severity,
      breachType,
      detectedAt: new Date().toISOString(),
      companyId: company.id,
      companyName: company.name,
      mappedNodesCount: 0,
    };
    addBreach(breach);
    breaches.push(breach);

    if (aiSuccess && extraction?.affectedVendors) {
      for (const vName of extraction.affectedVendors) {
        if (vName.toLowerCase() === companyName.toLowerCase()) continue;
        const vendor = getOrCreateVendor(vName, 'Cloud/SaaS');
        addRelationship({
          sourceCompanyId: company.id,
          targetVendorId: vendor.id,
          confidence: 0.9,
          discoveredFrom: 'ai_extraction',
        });
      }
    }
    const vendorCount = aiSuccess && extraction?.affectedVendors ? extraction.affectedVendors.length : 0;
    onProgress?.('detect', `found breach: ${companyName} (${severity}${aiSuccess ? '' : ' [regex fallback]'}, ${vendorCount} vendors)`);
  }

  return breaches;
}

const ENTERPRISE_VENDORS = [
  'AWS', 'Amazon Web Services', 'Azure', 'Microsoft Azure', 'Google Cloud', 'GCP',
  'Snowflake', 'Databricks', 'MongoDB', 'Elastic', 'Splunk',
  'Okta', 'Auth0', 'Ping Identity', 'OneLogin', 'CyberArk',
  'Salesforce', 'HubSpot', 'Zendesk', 'ServiceNow', 'SAP',
  'Twilio', 'SendGrid', 'Stripe', 'PayPal', 'Adyen',
  'Datadog', 'New Relic', 'PagerDuty',
  'CrowdStrike', 'Palo Alto', 'Fortinet', 'Zscaler', 'Cloudflare',
  'Slack', 'Zoom', 'Atlassian', 'Jira',
  'Workday', 'ADP', 'BambooHR',
  'Segment', 'Mixpanel', 'Amplitude',
  'Fastly', 'Akamai', 'Vercel', 'Netlify',
  'Cloudflare', 'Tailscale', 'HashiCorp', 'Confluent', 'Databricks',
  'GitLab', 'GitHub', 'Bitbucket', 'CircleCI', 'Buildkite',
  'Figma', 'Canva', 'Notion', 'Airtable', 'Monday',
  'DocuSign', 'Adobe', 'Box', 'Dropbox', 'ShareFile',
  'Rubrik', 'Cohesity', 'Veeam', 'Commvault',
  'Palo Alto Networks', 'Check Point', 'Sophos', 'Trend Micro', 'Malwarebytes',
  'Talend', 'Fivetran', 'dbt', 'Airbyte',
  'Confluent', 'Kafka', 'RabbitMQ',
];

function extractVendorNamesFromText(text: string): string[] {
  const found: string[] = [];
  for (const vendor of ENTERPRISE_VENDORS) {
    const regex = new RegExp(`\\b${vendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) found.push(vendor);
  }
  return [...new Set(found)].slice(0, 8);
}

function extractEnterpriseVendorsFromJobResults(items: DiscoverResultItem[]): string[] {
  const found: string[] = [];
  const allText = items.map(i => `${i.title} ${i.description}`).join(' ');
  for (const vendor of ENTERPRISE_VENDORS) {
    const regex = new RegExp(`\\b${vendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(allText)) found.push(vendor);
  }
  return [...new Set(found)].slice(0, 5);
}

export async function mapVendorNetwork(breach: Breach, onProgress?: ScanProgressCallback): Promise<void> {
  const c = getClient();
  onProgress?.('map', `mapping vendor network for ${breach.companyName}...`);

  const companyDomain = breach.companyName.toLowerCase().replace(/\s+/g, '') + '.com';

  try {
    onProgress?.('map', `scanning privacy policy for ${companyDomain}...`);
    const privacyResult = await c.scrapeUrl(`https://${companyDomain}/privacy`, {
      dataFormat: 'markdown',
      format: 'json',
      timeout: 15000,
    });

    if (privacyResult && typeof privacyResult === 'object' && 'body' in privacyResult) {
      const body = (privacyResult as { body: string }).body;
      const vendorNames = extractVendorNamesFromText(body);
      for (const vName of vendorNames) {
        if (vName.toLowerCase() === breach.companyName.toLowerCase()) continue;
        const vendor = getOrCreateVendor(vName, 'Cloud/SaaS');
        addRelationship({
          sourceCompanyId: breach.companyId,
          targetVendorId: vendor.id,
          confidence: 0.85,
          discoveredFrom: 'privacy_policy',
        });
        onProgress?.('map', `found vendor: ${vName} (via privacy policy)`);
      }
    }
  } catch (err) {
    console.error(`privacy policy scrape failed for ${companyDomain}:`, err);
  }

  try {
    onProgress?.('map', `searching for ${breach.companyName} enterprise vendors and partners...`);
    const jobsResult = await c.discover(`${breach.companyName} enterprise vendors partners technology stack SaaS`, {
      intent: 'enterprise SaaS vendors, cloud providers, and technology partners that this company uses or integrates with',
      includeContent: false,
      numResults: 5,
    });

    if (jobsResult.success && jobsResult.data) {
      const vendorNames = extractEnterpriseVendorsFromJobResults(jobsResult.data);
      for (const vName of vendorNames) {
        if (vName.toLowerCase() === breach.companyName.toLowerCase()) continue;
        const vendor = getOrCreateVendor(vName, 'Cloud/SaaS');
        addRelationship({
          sourceCompanyId: breach.companyId,
          targetVendorId: vendor.id,
          confidence: 0.7,
          discoveredFrom: 'tech_stack',
        });
        onProgress?.('map', `found vendor: ${vName} (via tech stack)`);
      }
    }
  } catch (err) {
    console.error(`tech stack search failed for ${breach.companyName}:`, err);
  }

  try {
    onProgress?.('map', `searching SERP for ${breach.companyName} technology vendors...`);
    const serpResult = await c.search.google(`${breach.companyName} technology stack vendors partners`, {
      format: 'json',
      dataFormat: 'markdown',
    });

    if (serpResult && typeof serpResult === 'object' && 'body' in serpResult) {
      const body = (serpResult as { body: string }).body;
      const vendorNames = extractVendorNamesFromText(body);
      for (const vName of vendorNames) {
        if (vName.toLowerCase() === breach.companyName.toLowerCase()) continue;
        const existing = getStore().relationships.find(
          r => r.sourceCompanyId === breach.companyId && r.targetVendorId === getOrCreateVendor(vName, 'Cloud/SaaS').id
        );
        if (existing) continue;
        const vendor = getOrCreateVendor(vName, 'Cloud/SaaS');
        addRelationship({
          sourceCompanyId: breach.companyId,
          targetVendorId: vendor.id,
          confidence: 0.6,
          discoveredFrom: 'serp_search',
        });
        onProgress?.('map', `found vendor: ${vName} (via SERP)`);
      }
    }
  } catch (err) {
    console.error(`SERP vendor search failed for ${breach.companyName}:`, err);
  }
}

export async function findCompaniesUsingVendor(vendorId: string, onProgress?: ScanProgressCallback): Promise<void> {
  const c = getClient();
  const vendor = getStore().vendors.get(vendorId);
  if (!vendor) return;

  const targets = await getTargetAccounts();
  onProgress?.('trace', `tracing blast radius through ${vendor.name}...`);

  try {
    const result = await c.discover(`companies using ${vendor.name} customers clients enterprise`, {
      intent: 'companies that use or integrate with this vendor, especially enterprise customers',
      includeContent: false,
      numResults: 8,
    });

    if (!result.success || !result.data) return;

    for (const item of result.data) {
      if (item.relevance_score < 0.3) continue;

      for (const target of targets) {
        const match = `${item.title} ${item.description}`.toLowerCase().includes(target.name.toLowerCase());
        if (match) {
          const existing = getStore().relationships.find(
            r => r.sourceCompanyId === target.id && r.targetVendorId === vendorId
          );
          if (!existing) {
            addRelationship({
              sourceCompanyId: target.id,
              targetVendorId: vendorId,
              confidence: 0.65,
              discoveredFrom: 'vendor_customer_search',
            });
            onProgress?.('trace', `${target.name} uses ${vendor.name} — in your target list`);
          }
        }
      }

      const mentionedCompany = extractCompanyNameFromResult(item);
      if (mentionedCompany && mentionedCompany.toLowerCase() !== vendor.name.toLowerCase()) {
        const company = getOrCreateCompany(
          mentionedCompany,
          `${mentionedCompany.toLowerCase().replace(/\s+/g, '')}.com`,
          'Technology'
        );
        const existing = getStore().relationships.find(
          r => r.sourceCompanyId === company.id && r.targetVendorId === vendorId
        );
        if (!existing) {
          addRelationship({
            sourceCompanyId: company.id,
            targetVendorId: vendorId,
            confidence: 0.5,
            discoveredFrom: 'vendor_customer_search',
          });
        }
      }
    }
  } catch (err) {
    console.error(`findCompaniesUsingVendor failed for ${vendor.name}:`, err);
  }
}

export async function enrichCompanyWithLinkedIn(companyName: string, companyDomain: string, onProgress?: ScanProgressCallback): Promise<{ employeeCount?: string; industry?: string; description?: string } | null> {
  const c = getClient();
  try {
    const searchUrl = `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`;
    onProgress?.('enrich', `enriching ${companyName} via LinkedIn (Web Scraper)...`);
    
    const result = await c.scrape.linkedin.companies([searchUrl], {
      pollTimeout: 15000,
      pollInterval: 3000,
    });

    if (!result.success || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
      onProgress?.('enrich', `LinkedIn enrichment for ${companyName} unavailable — continuing`);
      return null;
    }

    const companyData = result.data[0] as Record<string, unknown>;
    const enriched: { employeeCount?: string; industry?: string; description?: string } = {};
    
    if (companyData.employee_count) enriched.employeeCount = String(companyData.employee_count);
    if (companyData.industries) enriched.industry = String(companyData.industries);
    if (companyData.description) enriched.description = String(companyData.description).slice(0, 300);
    if (companyData.company_size) enriched.employeeCount = String(companyData.company_size);
    if (companyData.organization_type) enriched.industry = String(companyData.organization_type);

    if (Object.keys(enriched).length > 0) {
      const company = getOrCreateCompany(companyName, companyDomain, enriched.industry || 'Technology');
      if (enriched.employeeCount) company.employeeCount = enriched.employeeCount;
      if (enriched.description) company.linkedInDescription = enriched.description;
      onProgress?.('enrich', `enriched ${companyName} with LinkedIn data (${enriched.employeeCount || 'no employee count'})`);
      return enriched;
    }
    
    return null;
  } catch (err) {
    onProgress?.('enrich', `LinkedIn enrichment for ${companyName} timed out — continuing`);
    return null;
  }
}

export async function identifyProspects(breachId: string, onProgress?: ScanProgressCallback): Promise<void> {
  const breach = getStore().breaches.get(breachId);
  if (!breach) return;

  const vendorRels = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId);
  const targets = await getTargetAccounts();

  onProgress?.('prospect', 'cross-referencing blast zone with your target accounts...');

  for (const target of targets) {
    const existingProspect = getStore().prospects.find(
      p => p.companyId === target.id && p.breachId === breachId
    );
    if (existingProspect) continue;

    const targetVendors = getStore().relationships.filter(r => r.sourceCompanyId === target.id);
    const sharedVendors = vendorRels.filter(vr =>
      targetVendors.some(sv => sv.targetVendorId === vr.targetVendorId)
    );

    if (sharedVendors.length === 0) continue;

    const allSharedVendorNames = sharedVendors.map(sv => {
      const v = getStore().vendors.get(sv.targetVendorId);
      return v ? v.name : 'Unknown';
    });

    const bestVendor = sharedVendors.sort((a, b) => b.confidence - a.confidence)[0];
    const vendor = getStore().vendors.get(bestVendor.targetVendorId);
    if (!vendor) continue;

    const relevanceScore = Math.min(
      0.5 + sharedVendors.length * 0.1 + bestVendor.confidence * 0.25,
      0.99
    );

    const priority = relevanceScore > 0.85 ? 'P1' : relevanceScore > 0.7 ? 'P2' : 'P3';

    addProspect({
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      companyId: target.id,
      companyName: target.name,
      industry: target.industry,
      priority,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      connectionPath: [
        { type: 'COMPANY', name: breach.companyName },
        { type: 'VENDOR', name: vendor.name },
        { type: 'PROSPECT', name: target.name },
      ],
      breachId,
      targetVendorId: vendor.id,
    });

    onProgress?.('prospect', `${target.name} in blast zone via ${allSharedVendorNames.join(', ')}`);
  }
}
