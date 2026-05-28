export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type BreachType = "DATA_LEAK" | "RANSOMWARE" | "CREDENTIAL_EXPOSURE" | "VULNERABILITY" | "INSIDER_THREAT" | "THIRD_PARTY";
export type Status = "DETECTED" | "CONFIRMED" | "INVESTIGATING" | "CONTAINED" | "RESOLVED";

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
}

export interface Breach {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  breachType: BreachType;
  detectedAt: string;
  companyId: string;
  companyName: string;
  mappedNodesCount: number;
}

export interface VendorRelationship {
  sourceCompanyId: string;
  targetVendorId: string;
  confidence: number;
  discoveredFrom: string;
}

export interface Prospect {
  id: string;
  companyId: string;
  companyName: string;
  industry: string;
  priority: string;
  relevanceScore: number;
  connectionPath: Array<{ type: string; name: string }>;
  breachId: string;
  targetVendorId?: string;
}

export interface OutreachMessage {
  id: string;
  prospectId: string;
  subject: string;
  body: string;
  tone: string;
}
