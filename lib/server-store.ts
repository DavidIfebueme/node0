import type { Breach, Company, Vendor, VendorRelationship, Prospect } from './types';
import { getTurso, initDb } from './turso';

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
  scans: [],
  lastScanAt: null,
};

const DEFAULT_PROFILE: UserProfile = {
  userId: '',
  companyName: '',
  industry: '',
  domain: '',
};

export function getStore() {
  return store;
}

export function setCurrentUserId(userId: string) {
  if (store.profile && store.profile.userId && store.profile.userId !== userId) {
    store.breaches.clear();
    store.companies.clear();
    store.vendors.clear();
    store.relationships = [];
    store.prospects = [];
    store.lastScanAt = null;
  }
  if (!store.profile) {
    store.profile = { ...DEFAULT_PROFILE, userId };
  } else {
    store.profile.userId = userId;
  }
}

export async function getProfile(): Promise<UserProfile> {
  if (!store.profile) {
    store.profile = DEFAULT_PROFILE;
  }
  try {
    await initDb();
    const result = await getTurso().execute({
      sql: "SELECT company_name, industry, domain FROM users WHERE id = ?",
      args: [store.profile.userId],
    });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      store.profile = {
        userId: store.profile.userId,
        companyName: (row.company_name as string) || '',
        industry: (row.industry as string) || '',
        domain: (row.domain as string) || '',
      };
    }
  } catch {}
  return store.profile;
}

export async function getTargetAccounts(): Promise<Company[]> {
  try {
    await initDb();
    const result = await getTurso().execute({
      sql: "SELECT id, name, domain, industry FROM target_accounts WHERE user_id = ? ORDER BY created_at",
      args: [store.profile?.userId || ''],
    });
    if (result.rows.length > 0) {
      return result.rows.map(r => ({
        id: r.id as string,
        name: r.name as string,
        domain: r.domain as string,
        industry: r.industry as string,
      }));
    }
  } catch {}
  return [];
}

export function addBreach(breach: Breach) {
  store.breaches.set(breach.id, breach);
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

export function removeBreach(breachId: string) {
  const breach = store.breaches.get(breachId);
  if (!breach) return;
  store.relationships = store.relationships.filter(r => r.sourceCompanyId !== breach.companyId);
  store.prospects = store.prospects.filter(p => p.breachId !== breachId);
  store.breaches.delete(breachId);
  const usedCompanyIds = new Set(Array.from(store.breaches.values()).map(b => b.companyId));
  const usedVendorIds = new Set(store.relationships.map(r => r.targetVendorId));
  for (const [id] of store.companies) {
    if (!usedCompanyIds.has(id)) store.companies.delete(id);
  }
  for (const [id] of store.vendors) {
    if (!usedVendorIds.has(id)) store.vendors.delete(id);
  }
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

export async function saveScanState() {
  if (!store.profile?.userId) return;
  try {
    await initDb();
    const turso = getTurso();
    const data = JSON.stringify({
      breaches: Array.from(store.breaches.entries()),
      companies: Array.from(store.companies.entries()),
      vendors: Array.from(store.vendors.entries()),
      relationships: store.relationships,
      prospects: store.prospects,
    });
    await turso.execute({
      sql: "INSERT OR REPLACE INTO scan_state (user_id, data, updated_at) VALUES (?, ?, datetime('now'))",
      args: [store.profile.userId, data],
    });
  } catch (err) {
    console.error('saveScanState error:', err);
  }
}

export async function loadScanState(): Promise<boolean> {
  if (!store.profile?.userId) return false;
  try {
    await initDb();
    const turso = getTurso();
    const result = await turso.execute({
      sql: "SELECT data FROM scan_state WHERE user_id = ?",
      args: [store.profile.userId],
    });
    if (result.rows.length === 0) {
      store.breaches.clear();
      store.companies.clear();
      store.vendors.clear();
      store.relationships = [];
      store.prospects = [];
      return false;
    }

    const parsed = JSON.parse(result.rows[0].data as string);
    if (parsed.breaches) store.breaches = new Map(parsed.breaches);
    if (parsed.companies) store.companies = new Map(parsed.companies);
    if (parsed.vendors) store.vendors = new Map(parsed.vendors);
    if (parsed.relationships) store.relationships = parsed.relationships;
    if (parsed.prospects) store.prospects = parsed.prospects;
    return true;
  } catch (err) {
    console.error('loadScanState error:', err);
    return false;
  }
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
