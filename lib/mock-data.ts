import { Breach, Prospect, Vendor } from "./types";

export const MOCK_BREACHES: Breach[] = [
  {
    id: "br-001",
    title: "AWS S3 Bucket Exposure",
    description: "Unsecured bucket exposed 40M customer records.",
    severity: "CRITICAL",
    breachType: "DATA_LEAK",
    detectedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    companyId: "co-001",
    companyName: "CloudStorage Inc",
    mappedNodesCount: 23,
  },
  {
    id: "br-002",
    title: "Okta Local Agent Vulnerability",
    description: "Zero-day vulnerability in local sync agent.",
    severity: "HIGH",
    breachType: "VULNERABILITY",
    detectedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    companyId: "co-002",
    companyName: "Okta",
    mappedNodesCount: 89,
  },
  {
    id: "br-003",
    title: "SolarWinds Orion Malware",
    description: "Supply chain attack via malicious update.",
    severity: "CRITICAL",
    breachType: "THIRD_PARTY",
    detectedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    companyId: "co-003",
    companyName: "SolarWinds",
    mappedNodesCount: 154,
  },
  {
    id: "br-004",
    title: "Twilio Social Engineering",
    description: "Employee credentials compromised via SMS phishing.",
    severity: "MEDIUM",
    breachType: "CREDENTIAL_EXPOSURE",
    detectedAt: new Date(Date.now() - 480 * 60000).toISOString(),
    companyId: "co-004",
    companyName: "Twilio",
    mappedNodesCount: 12,
  },
];

export const MOCK_PROSPECTS: Prospect[] = [
  {
    id: "pr-001",
    companyId: "co-005",
    companyName: "Acme Corp",
    industry: "Manufacturing",
    priority: "P1",
    relevanceScore: 0.92,
    connectionPath: [
      { type: "COMPANY", name: "CloudStorage Inc" },
      { type: "VENDOR", name: "AWS" },
      { type: "PROSPECT", name: "Acme Corp" }
    ],
    breachId: "br-001"
  },
  {
    id: "pr-002",
    companyId: "co-006",
    companyName: "Globex Corporation",
    industry: "Logistics",
    priority: "P2",
    relevanceScore: 0.85,
    connectionPath: [
      { type: "COMPANY", name: "SolarWinds" },
      { type: "VENDOR", name: "Orion" },
      { type: "PROSPECT", name: "Globex Corporation" }
    ],
    breachId: "br-003"
  },
  {
    id: "pr-003",
    companyId: "co-007",
    companyName: "Initech",
    industry: "Software",
    priority: "P1",
    relevanceScore: 0.98,
    connectionPath: [
      { type: "COMPANY", name: "Okta" },
      { type: "VENDOR", name: "AuthServer" },
      { type: "PROSPECT", name: "Initech" }
    ],
    breachId: "br-002"
  }
];

export const getMockGraphData = (breachId: string) => {
  const breach = MOCK_BREACHES.find(b => b.id === breachId) || MOCK_BREACHES[0];
  return {
    nodes: [
      { id: "n0", type: "origin", position: { x: 0, y: 0 }, data: { label: breach.companyName, type: breach.breachType } },
      { id: "v1", type: "vendor", position: { x: -200, y: 150 }, data: { label: "AWS S3" } },
      { id: "v2", type: "vendor", position: { x: 200, y: 150 }, data: { label: "Okta Auth" } },
      { id: "v3", type: "vendor", position: { x: 0, y: 250 }, data: { label: "Snowflake" } },
      { id: "a1", type: "affected", position: { x: -350, y: 300 }, data: { label: "TechCorp" } },
      { id: "a2", type: "affected", position: { x: 350, y: 300 }, data: { label: "DataSys" } },
      { id: "p1", type: "prospect", position: { x: -100, y: 400 }, data: { label: "Acme Corp" } },
      { id: "p2", type: "prospect", position: { x: 100, y: 400 }, data: { label: "Initech" } },
      { id: "p3", type: "prospect", position: { x: 250, y: 450 }, data: { label: "Globex Corp" } },
    ],
    edges: [
      { id: "e-0-1", source: "n0", target: "v1", animated: true },
      { id: "e-0-2", source: "n0", target: "v2", animated: true },
      { id: "e-0-3", source: "n0", target: "v3", animated: true },
      { id: "e-1-a1", source: "v1", target: "a1", animated: true },
      { id: "e-2-a2", source: "v2", target: "a2", animated: true },
      { id: "e-1-p1", source: "v1", target: "p1", animated: true },
      { id: "e-3-p2", source: "v3", target: "p2", animated: true },
      { id: "e-2-p3", source: "v2", target: "p3", animated: true },
    ]
  };
};
