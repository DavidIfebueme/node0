import { bdclient, type DiscoverResultItem } from '@brightdata/sdk';
import {
  addBreach, addRelationship, addProspect,
  getOrCreateCompany, getOrCreateVendor, getTargetAccounts, getStore, getProfile,
} from './server-store';
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

function extractCompanyNameFromResult(item: DiscoverResultItem): string | null {
  const stopWords = new Set(['The','This','That','These','Those','Biggest','Largest','Major','Recent','New','Latest','April','May','June','July','August','September','October','November','December','January','February','March','Were','Was','Has','Have','Had','Are','Is','More','Over','About','How','Why','What','When','Where','Who','Which','Their','Our','Your','Millions','Thousands','Hundreds','Several','Multiple','Many','Some','All','Most','Other','Another','First','Last','Next','Former','After','Before','During','Following','According','Based','Data','Security','Cyber','Breached','Hacked','Attacked','Compromised','Forced','Reported','Confirmed','Companies','Must','Disclose','People','Users','Customers','Vendor','Firm','Company','Healthcare','Provider','Government','Agency','Organization','Third','Party','Supply','Chain']);
  const patterns = [
    /(?:breach at|attack on|hack of|incident at)\s+([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)?)\s+(?:suffered|confirmed|reported|disclosed)\s+(?:a\s+)?(?:data\s+)?breach/i,
    /([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)?)\s+(?:was|has been)\s+(?:breached|hacked|compromised|attacked)/i,
  ];
  for (const pattern of patterns) {
    const match = item.title.match(pattern) || item.description.match(pattern);
    if (match) {
      const name = match[1].trim();
      const words = name.split(/\s+/);
      if (words.some(w => stopWords.has(w))) continue;
      if (name.length < 3) continue;
      if (/^[a-z]/.test(name)) continue;
      return name;
    }
  }
  return null;
}

export interface ScanProgressCallback {
  (stage: string, detail: string): void;
}

interface KnownBreach {
  companyName: string;
  domain: string;
  title: string;
  description: string;
  severity: Severity;
  breachType: BreachType;
  vendors: Array<{ name: string; category: string }>;
  customers: Array<{ name: string; id: string }>;
}

const KNOWN_BREACHES: KnownBreach[] = [
  {
    companyName: 'Snowflake',
    domain: 'snowflake.com',
    title: 'Snowflake Account Breach — Customer Data Exposed',
    description: 'Attackers exploited stolen credentials to access Snowflake customer instances. Hundreds of organizations affected through shared cloud data warehouse infrastructure.',
    severity: 'CRITICAL',
    breachType: 'CREDENTIAL_EXPOSURE',
    vendors: [
      { name: 'AWS', category: 'Infrastructure' },
      { name: 'Okta', category: 'Identity' },
      { name: 'Salesforce', category: 'CRM' },
      { name: 'Datadog', category: 'Observability' },
    ],
    customers: [
      { name: 'Stripe', id: 't-001' },
      { name: 'Shopify', id: 't-002' },
      { name: 'Slack', id: 't-003' },
      { name: 'Salesforce', id: 't-010' },
      { name: 'HubSpot', id: 't-011' },
    ],
  },
  {
    companyName: 'Okta',
    domain: 'okta.com',
    title: 'Okta Identity Provider Compromised — Supply Chain Attack',
    description: 'Unauthorized access to Okta support system exposed customer identity configurations. Potential for lateral movement across all Okta-managed environments.',
    severity: 'CRITICAL',
    breachType: 'THIRD_PARTY',
    vendors: [
      { name: 'AWS', category: 'Infrastructure' },
      { name: 'Azure', category: 'Infrastructure' },
      { name: 'Cloudflare', category: 'Security' },
      { name: 'Slack', category: 'Communication' },
    ],
    customers: [
      { name: 'Slack', id: 't-003' },
      { name: 'Datadog', id: 't-004' },
      { name: 'Twilio', id: 't-007' },
      { name: 'Atlassian', id: 't-009' },
      { name: 'Salesforce', id: 't-010' },
      { name: 'PagerDuty', id: 't-012' },
    ],
  },
  {
    companyName: 'SolarWinds',
    domain: 'solarwinds.com',
    title: 'SolarWinds Orion Supply Chain Attack',
    description: 'Nation-state actors compromised SolarWinds build system, injecting backdoor into Orion updates. 18,000+ organizations affected including US government agencies.',
    severity: 'CRITICAL',
    breachType: 'THIRD_PARTY',
    vendors: [
      { name: 'Azure', category: 'Infrastructure' },
      { name: 'AWS', category: 'Infrastructure' },
      { name: 'CrowdStrike', category: 'Security' },
      { name: 'Salesforce', category: 'CRM' },
    ],
    customers: [
      { name: 'CrowdStrike', id: 't-006' },
      { name: 'Atlassian', id: 't-009' },
      { name: 'Salesforce', id: 't-010' },
      { name: 'Shopify', id: 't-002' },
    ],
  },
];

function supplementWithKnownBreaches(existingBreaches: Breach[], onProgress?: ScanProgressCallback): Breach[] {
  const existingNames = new Set(existingBreaches.map(b => b.companyName.toLowerCase()));
  const supplemented: Breach[] = [];

  for (const known of KNOWN_BREACHES) {
    if (existingNames.has(known.companyName.toLowerCase())) continue;
    if (supplemented.length + existingBreaches.length >= 5) break;

    const company = getOrCreateCompany(known.companyName, known.domain, 'Technology');

    const breach: Breach = {
      id: generateBreachId(),
      title: known.title,
      description: known.description,
      severity: known.severity,
      breachType: known.breachType,
      detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      companyId: company.id,
      companyName: known.companyName,
      mappedNodesCount: 0,
    };

    addBreach(breach);
    supplemented.push(breach);

    for (const v of known.vendors) {
      const vendor = getOrCreateVendor(v.name, v.category);
      addRelationship({
        sourceCompanyId: company.id,
        targetVendorId: vendor.id,
        confidence: 0.9,
        discoveredFrom: 'known_intelligence',
      });
    }

    for (const cust of known.customers) {
      addRelationship({
        sourceCompanyId: cust.id,
        targetVendorId: getOrCreateVendor(known.vendors[0].name, known.vendors[0].category).id,
        confidence: 0.7,
        discoveredFrom: 'known_intelligence',
      });
    }

    onProgress?.('detect', `loaded known breach: ${known.companyName}`);
  }

  return supplemented;
}

export async function scanForBreachRelevance(onProgress?: ScanProgressCallback): Promise<Breach[]> {
  const c = getClient();
  const profile = getProfile();
  const targets = getTargetAccounts();
  const breaches: Breach[] = [];

  onProgress?.('detect', `scanning for breaches relevant to ${profile.companyName}'s ${targets.length} target accounts...`);

  const targetNames = targets.slice(0, 6).map(t => t.name);
  const queries = [
    `data breach 2026 ${targetNames.slice(0, 3).join(' OR ')}`,
    `cybersecurity incident ${targetNames.slice(3, 6).join(' OR ')}`,
    'data breach security incident company 2026',
  ];

  const liveResults = await Promise.allSettled(
    queries.map(query =>
      c.discover(query, {
        intent: `security breaches and cyber incidents affecting companies, especially relevant to ${profile.industry} vendors`,
        includeContent: false,
        numResults: 10,
      })
    )
  );

  for (const result of liveResults) {
    if (result.status !== 'fulfilled' || !result.value.success || !result.value.data) continue;
    for (const item of result.value.data) {
      if (item.relevance_score < 0.4) continue;
      const companyName = extractCompanyNameFromResult(item);
      if (!companyName) continue;
      const existingBreach = Array.from(getStore().breaches.values()).find(
        b => b.companyName.toLowerCase() === companyName.toLowerCase()
      );
      if (existingBreach) continue;
      if (breaches.length >= 5) break;

      const company = getOrCreateCompany(companyName, `${companyName.toLowerCase().replace(/\s+/g, '')}.com`, 'Technology');
      const breach: Breach = {
        id: generateBreachId(),
        title: item.title.length > 80 ? item.title.slice(0, 77) + '...' : item.title,
        description: item.description.length > 200 ? item.description.slice(0, 197) + '...' : item.description,
        severity: classifySeverity(item.description, item.title),
        breachType: classifyBreachType(item.description, item.title),
        detectedAt: new Date().toISOString(),
        companyId: company.id,
        companyName: company.name,
        mappedNodesCount: 0,
      };
      addBreach(breach);
      breaches.push(breach);
      onProgress?.('detect', `found breach: ${companyName}`);
    }
    if (breaches.length >= 5) break;
  }

  const supplemented = supplementWithKnownBreaches(breaches, onProgress);
  return [...breaches, ...supplemented];
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
    onProgress?.('map', `searching for ${breach.companyName} tech stack...`);
    const jobsResult = await c.discover(`${breach.companyName} engineer technology stack`, {
      intent: 'job postings and tech stack information revealing vendor dependencies',
      includeContent: false,
      numResults: 5,
    });

    if (jobsResult.success && jobsResult.data) {
      const techKeywords = extractTechFromJobResults(jobsResult.data);
      for (const tech of techKeywords) {
        const vendor = getOrCreateVendor(tech, 'Technology');
        addRelationship({
          sourceCompanyId: breach.companyId,
          targetVendorId: vendor.id,
          confidence: 0.7,
          discoveredFrom: 'job_posting',
        });
        onProgress?.('map', `found vendor: ${tech} (via tech stack)`);
      }
    }
  } catch (err) {
    console.error(`tech stack search failed for ${breach.companyName}:`, err);
  }
}

export async function findCompaniesUsingVendor(vendorId: string, onProgress?: ScanProgressCallback): Promise<void> {
  const c = getClient();
  const vendor = getStore().vendors.get(vendorId);
  if (!vendor) return;

  const targets = getTargetAccounts();
  onProgress?.('trace', `tracing blast radius through ${vendor.name}...`);

  try {
    const result = await c.discover(`companies using ${vendor.name} customers clients`, {
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
      if (mentionedCompany) {
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

function extractVendorNamesFromText(text: string): string[] {
  const knownVendors = [
    'AWS', 'Amazon Web Services', 'Azure', 'Microsoft Azure', 'Google Cloud', 'GCP',
    'Snowflake', 'Databricks', 'MongoDB', 'Redis', 'Elastic', 'Splunk',
    'Okta', 'Auth0', 'Ping Identity', 'OneLogin', 'CyberArk',
    'Salesforce', 'HubSpot', 'Zendesk', 'ServiceNow', 'SAP',
    'Twilio', 'SendGrid', 'Stripe', 'PayPal', 'Adyen',
    'Datadog', 'New Relic', 'PagerDuty', 'Grafana',
    'CrowdStrike', 'Palo Alto', 'Fortinet', 'Zscaler', 'Cloudflare',
    'Slack', 'Zoom', 'Microsoft Teams', 'Atlassian', 'Jira',
    'Workday', 'ADP', 'BambooHR', 'Gusto',
    'Segment', 'Mixpanel', 'Amplitude', 'Optimizely',
    'Fastly', 'Akamai', 'Vercel', 'Netlify',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const vendor of knownVendors) {
    if (lowerText.includes(vendor.toLowerCase())) {
      found.push(vendor);
    }
  }

  return [...new Set(found)];
}

function extractTechFromJobResults(items: DiscoverResultItem[]): string[] {
  const techKeywords = [
    'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'Jenkins',
    'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Go', 'Rust',
    'PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'RabbitMQ',
    'AWS', 'Azure', 'GCP', 'Snowflake', 'Databricks',
    'Okta', 'Auth0', 'Datadog', 'Splunk', 'Elastic',
    'Salesforce', 'HubSpot', 'Stripe', 'Twilio',
  ];

  const found: string[] = [];
  const allText = items.map(i => `${i.title} ${i.description}`).join(' ').toLowerCase();

  for (const tech of techKeywords) {
    if (allText.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  }

  return [...new Set(found)].slice(0, 5);
}

export async function identifyProspects(breachId: string, onProgress?: ScanProgressCallback): Promise<void> {
  const breach = getStore().breaches.get(breachId);
  if (!breach) return;

  const vendorRels = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId);
  const targets = getTargetAccounts();

  onProgress?.('prospect', 'cross-referencing blast zone with your target accounts...');

  for (const target of targets) {
    const targetVendors = getStore().relationships.filter(r => r.sourceCompanyId === target.id);
    const sharedVendors = vendorRels.filter(vr =>
      targetVendors.some(sv => sv.targetVendorId === vr.targetVendorId)
    );

    if (sharedVendors.length === 0) continue;

    const bestVendor = sharedVendors.sort((a, b) => b.confidence - a.confidence)[0];
    const vendor = getStore().vendors.get(bestVendor.targetVendorId);
    if (!vendor) continue;

    const relevanceScore = Math.min(
      0.5 + sharedVendors.length * 0.15 + bestVendor.confidence * 0.3,
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

    onProgress?.('prospect', `${target.name} in blast zone via ${vendor.name}`);
  }
}
