import { bdclient, type DiscoverResultItem } from '@brightdata/sdk';
import {
  addBreach, addRelationship, addProspect,
  getOrCreateCompany, getOrCreateVendor, getSeedCompanies, getStore,
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
  const stopWords = new Set(['The','This','That','These','Those','Biggest','Largest','Major','Recent','New','Latest','April','May','June','July','August','September','October','November','December','January','February','March','Were','Was','Has','Have','Had','Are','Is','More','Over','About','How','Why','What','When','Where','Who','Which','Their','Our','Your','Millions','Thousands','Hundreds','Several','Multiple','Many','Some','All','Most','Other','Another','First','Last','Next','Former','After','Before','During','Following','According','Based','Data','Security','Cyber','Breached','Hacked','Attacked','Compromised','Forced','Reported','Confirmed','Companies','Must','Disclose','People','Users','Customers']);
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
      if (words.every(w => stopWords.has(w))) continue;
      if (words.length === 1 && stopWords.has(words[0])) continue;
      if (name.length < 3) continue;
      return name;
    }
  }
  return null;
}

export interface ScanProgressCallback {
  (stage: string, detail: string): void;
}

export async function detectBreaches(onProgress?: ScanProgressCallback): Promise<Breach[]> {
  const c = getClient();
  const breaches: Breach[] = [];

  const queries = [
    'data breach 2026 security incident',
    'cybersecurity breach disclosure recent',
    'ransomware attack company 2026',
  ];

  onProgress?.('detect', 'scanning for recent security breaches...');

  for (const query of queries) {
    try {
      const result = await c.discover(query, {
        intent: 'security breach disclosures and cyber incidents affecting companies',
        includeContent: false,
        numResults: 10,
      });

      if (!result.success || !result.data) continue;

      for (const item of result.data) {
        if (item.relevance_score < 0.4) continue;
        const companyName = extractCompanyNameFromResult(item);
        if (!companyName) continue;

        const existingBreach = Array.from(getStore().breaches.values()).find(
          b => b.companyName.toLowerCase() === companyName.toLowerCase()
        );
        if (existingBreach) continue;
        if (breaches.length >= 3) break;

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
      if (breaches.length >= 3) break;
    } catch (err) {
      console.error('detectBreaches query failed:', err);
    }
  }

  return breaches;
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
    onProgress?.('map', `searching for ${breach.companyName} tech stack via job postings...`);
    const jobsResult = await c.discover(`site:linkedin.com/jobs ${breach.companyName} engineer`, {
      intent: 'job postings that reveal technology stack and vendor usage',
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
        onProgress?.('map', `found vendor: ${tech} (via job posting)`);
      }
    }
  } catch (err) {
    console.error(`job search failed for ${breach.companyName}:`, err);
  }

  try {
    onProgress?.('map', `searching for ${breach.companyName} vendor partnerships...`);
    const partnerResult = await c.discover(`${breach.companyName} partnership vendor integration uses`, {
      intent: 'publicly disclosed vendor relationships and technology partnerships',
      includeContent: false,
      numResults: 5,
    });

    if (partnerResult.success && partnerResult.data) {
      for (const item of partnerResult.data) {
        if (item.relevance_score < 0.4) continue;
        const vendors = extractVendorNamesFromText(`${item.title} ${item.description}`);
        for (const vName of vendors) {
          const vendor = getOrCreateVendor(vName, 'Partner');
          const existing = getStore().relationships.find(
            r => r.sourceCompanyId === breach.companyId && r.targetVendorId === vendor.id
          );
          if (!existing) {
            addRelationship({
              sourceCompanyId: breach.companyId,
              targetVendorId: vendor.id,
              confidence: 0.6,
              discoveredFrom: 'partnership_search',
            });
            onProgress?.('map', `found vendor: ${vName} (via partnership)`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`partnership search failed for ${breach.companyName}:`, err);
  }
}

export async function findCompaniesUsingVendor(vendorId: string, onProgress?: ScanProgressCallback): Promise<void> {
  const c = getClient();
  const vendor = getStore().vendors.get(vendorId);
  if (!vendor) return;

  onProgress?.('trace', `tracing blast radius through ${vendor.name}...`);

  try {
    const result = await c.discover(`companies using ${vendor.name} customers case study`, {
      intent: 'companies that use or integrate with this vendor',
      includeContent: false,
      numResults: 8,
    });

    if (!result.success || !result.data) return;

    const seedCompanies = getSeedCompanies();

    for (const item of result.data) {
      if (item.relevance_score < 0.3) continue;
      for (const seed of seedCompanies) {
        const match = `${item.title} ${item.description}`.toLowerCase().includes(seed.name.toLowerCase());
        if (match) {
          const existing = getStore().relationships.find(
            r => r.sourceCompanyId === seed.id && r.targetVendorId === vendorId
          );
          if (!existing) {
            addRelationship({
              sourceCompanyId: seed.id,
              targetVendorId: vendorId,
              confidence: 0.65,
              discoveredFrom: 'vendor_customer_search',
            });
            onProgress?.('trace', `${seed.name} uses ${vendor.name}`);
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
  const seedCompanies = getSeedCompanies();

  onProgress?.('prospect', 'identifying prospects in blast zones...');

  for (const seed of seedCompanies) {
    const seedVendors = getStore().relationships.filter(r => r.sourceCompanyId === seed.id);
    const sharedVendors = vendorRels.filter(vr =>
      seedVendors.some(sv => sv.targetVendorId === vr.targetVendorId)
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
      companyId: seed.id,
      companyName: seed.name,
      industry: seed.industry,
      priority,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      connectionPath: [
        { type: 'COMPANY', name: breach.companyName },
        { type: 'VENDOR', name: vendor.name },
        { type: 'PROSPECT', name: seed.name },
      ],
      breachId,
      targetVendorId: vendor.id,
    });

    onProgress?.('prospect', `${seed.name} in blast zone via ${vendor.name}`);
  }
}
