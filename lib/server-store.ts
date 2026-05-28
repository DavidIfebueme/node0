import type { Breach, Company, Vendor, VendorRelationship, Prospect, OutreachMessage } from './types';

export interface UserProfile {
  userId: string;
  companyName: string;
  industry: string;
  domain: string;
}

interface ScanResult {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  breachesFound: number;
  vendorsMapped: number;
  prospectsIdentified: number;
}

interface Store {
  profile: UserProfile | null;
  breaches: Map<string, Breach>;
  companies: Map<string, Company>;
  vendors: Map<string, Vendor>;
  relationships: VendorRelationship[];
  prospects: Prospect[];
  outreach: OutreachMessage[];
  scans: ScanResult[];
  lastScanAt: string | null;
}

const store: Store = {
  profile: null,
  breaches: new Map(),
  companies: new Map(),
  vendors: new Map(),
  relationships: [],
  prospects: [],
  outreach: [],
  scans: [],
  lastScanAt: null,
};

const DEFAULT_PROSPECTS: Company[] = [
  { id: 't-001', name: 'Stripe', domain: 'stripe.com', industry: 'Fintech' },
  { id: 't-002', name: 'Shopify', domain: 'shopify.com', industry: 'E-Commerce' },
  { id: 't-003', name: 'Slack', domain: 'slack.com', industry: 'SaaS' },
  { id: 't-004', name: 'Datadog', domain: 'datadoghq.com', industry: 'Observability' },
  { id: 't-005', name: 'Snowflake', domain: 'snowflake.com', industry: 'Data Warehouse' },
  { id: 't-006', name: 'CrowdStrike', domain: 'crowdstrike.com', industry: 'Cybersecurity' },
  { id: 't-007', name: 'Twilio', domain: 'twilio.com', industry: 'Communications' },
  { id: 't-008', name: 'Okta', domain: 'okta.com', industry: 'Identity' },
  { id: 't-009', name: 'Atlassian', domain: 'atlassian.com', industry: 'Collaboration' },
  { id: 't-010', name: 'Salesforce', domain: 'salesforce.com', industry: 'CRM' },
  { id: 't-011', name: 'HubSpot', domain: 'hubspot.com', industry: 'Marketing' },
  { id: 't-012', name: 'PagerDuty', domain: 'pagerduty.com', industry: 'Incident Management' },
];

const DEFAULT_PROFILE: UserProfile = {
  userId: '1',
  companyName: 'SentinelShield',
  industry: 'Cybersecurity',
  domain: 'sentinelshield.io',
};

store.profile = DEFAULT_PROFILE;
DEFAULT_PROSPECTS.forEach(c => store.companies.set(c.id, c));

export function getStore() {
  return store;
}

export function getProfile(): UserProfile {
  if (!store.profile) {
    store.profile = DEFAULT_PROFILE;
  }
  return store.profile;
}

export function updateProfile(profile: Partial<UserProfile>) {
  store.profile = { ...getProfile(), ...profile };
}

export function getTargetAccounts(): Company[] {
  return DEFAULT_PROSPECTS;
}

export function addTargetAccount(company: Company) {
  const existing = Array.from(store.companies.values()).find(c => c.name.toLowerCase() === company.name.toLowerCase());
  if (!existing) {
    store.companies.set(company.id, company);
    DEFAULT_PROSPECTS.push(company);
  }
}

export function removeTargetAccount(companyId: string) {
  const idx = DEFAULT_PROSPECTS.findIndex(c => c.id === companyId);
  if (idx >= 0) DEFAULT_PROSPECTS.splice(idx, 1);
  store.prospects = store.prospects.filter(p => p.companyId !== companyId);
}

export function addBreach(breach: Breach) {
  store.breaches.set(breach.id, breach);
}

export function addCompany(company: Company) {
  store.companies.set(company.id, company);
}

export function addVendor(vendor: Vendor) {
  store.vendors.set(vendor.id, vendor);
}

export function addRelationship(rel: VendorRelationship) {
  store.relationships.push(rel);
}

export function addProspect(prospect: Prospect) {
  const existing = store.prospects.find(
    p => p.companyId === prospect.companyId && p.breachId === prospect.breachId
  );
  if (!existing) {
    store.prospects.push(prospect);
  }
}

export function addOutreach(message: OutreachMessage) {
  store.outreach.push(message);
}

export function getOrCreateCompany(name: string, domain: string, industry: string): Company {
  const existing = Array.from(store.companies.values()).find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const company: Company = { id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, domain, industry };
  store.companies.set(company.id, company);
  return company;
}

export function getOrCreateVendor(name: string, category: string): Vendor {
  const existing = Array.from(store.vendors.values()).find(v => v.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const vendor: Vendor = { id: `vn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, category };
  store.vendors.set(vendor.id, vendor);
  return vendor;
}

export function startScan(): ScanResult {
  const scan: ScanResult = {
    id: `scan-${Date.now()}`,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    breachesFound: 0,
    vendorsMapped: 0,
    prospectsIdentified: 0,
  };
  store.scans.push(scan);
  return scan;
}

export function completeScan(scanId: string, stats: Partial<ScanResult>) {
  const scan = store.scans.find(s => s.id === scanId);
  if (scan) {
    Object.assign(scan, stats, { completedAt: new Date().toISOString(), status: 'completed' as const });
  }
  store.lastScanAt = new Date().toISOString();
}

export function getAllBreaches(): Breach[] {
  return Array.from(store.breaches.values()).sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

export function getBreachById(id: string): Breach | undefined {
  return store.breaches.get(id);
}

export function getVendorsForCompany(companyId: string): { vendor: Vendor; relationship: VendorRelationship }[] {
  return store.relationships
    .filter(r => r.sourceCompanyId === companyId)
    .map(r => ({
      vendor: store.vendors.get(r.targetVendorId)!,
      relationship: r,
    }))
    .filter(v => v.vendor);
}

export function getCompaniesUsingVendor(vendorId: string): { company: Company; relationship: VendorRelationship }[] {
  return store.relationships
    .filter(r => r.targetVendorId === vendorId)
    .map(r => ({
      company: store.companies.get(r.sourceCompanyId)!,
      relationship: r,
    }))
    .filter(c => c.company);
}

export function getProspectsForBreach(breachId: string): Prospect[] {
  return store.prospects.filter(p => p.breachId === breachId);
}

export function getAllProspects(): Prospect[] {
  return store.prospects.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function getProspectById(id: string): Prospect | undefined {
  return store.prospects.find(p => p.id === id);
}

export function getOutreachForProspect(prospectId: string): OutreachMessage | undefined {
  return store.outreach.find(m => m.prospectId === prospectId);
}

export function resetStore() {
  store.breaches.clear();
  store.vendors.clear();
  store.relationships = [];
  store.prospects = [];
  store.outreach = [];
  store.scans = [];
  store.lastScanAt = null;
}

export function getGraphData(breachId: string) {
  const breach = store.breaches.get(breachId);
  if (!breach) return { nodes: [], edges: [] };

  const nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, string> }> = [];
  const edges: Array<{ id: string; source: string; target: string; animated?: boolean }> = [];

  nodes.push({
    id: `breach-${breach.id}`,
    type: 'origin',
    position: { x: 0, y: 0 },
    data: { label: breach.companyName, type: breach.breachType },
  });

  const companyRels = store.relationships.filter(r => r.sourceCompanyId === breach.companyId);
  const vendorPositions = companyRels.map((rel, i) => {
    const vendor = store.vendors.get(rel.targetVendorId);
    if (!vendor) return null;
    const angle = (2 * Math.PI * i) / Math.max(companyRels.length, 1) - Math.PI / 2;
    const radius = 250;
    return {
      rel,
      vendor,
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
    };
  }).filter(Boolean) as Array<{ rel: VendorRelationship; vendor: Vendor; position: { x: number; y: number } }>;

  vendorPositions.forEach(({ rel, vendor, position }) => {
    const vendorNodeId = `vendor-${vendor.id}`;
    nodes.push({ id: vendorNodeId, type: 'vendor', position, data: { label: vendor.name } });
    edges.push({ id: `edge-${breach.id}-${vendor.id}`, source: `breach-${breach.id}`, target: vendorNodeId, animated: true });

    const companiesUsingVendor = store.relationships.filter(r => r.targetVendorId === vendor.id && r.sourceCompanyId !== breach.companyId);
    companiesUsingVendor.forEach((companyRel, j) => {
      const company = store.companies.get(companyRel.sourceCompanyId);
      if (!company) return;
      const isProspect = store.prospects.some(p => p.companyId === company.id && p.breachId === breachId);
      const companyNodeId = `company-${company.id}`;
      if (!nodes.find(n => n.id === companyNodeId)) {
        const offsetX = (j - companiesUsingVendor.length / 2) * 120;
        nodes.push({
          id: companyNodeId,
          type: isProspect ? 'prospect' : 'affected',
          position: { x: position.x + offsetX, y: position.y + 200 },
          data: { label: company.name },
        });
      }
      if (!edges.find(e => e.source === vendorNodeId && e.target === companyNodeId)) {
        edges.push({ id: `edge-${vendor.id}-${company.id}`, source: vendorNodeId, target: companyNodeId, animated: isProspect });
      }
    });
  });

  return { nodes, edges };
}
