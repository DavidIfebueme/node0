import { createClient, type Client } from '@libsql/client/web';

let _client: Client | null = null;

export function getTurso(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    }
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function initDb() {
  const turso = getTurso();

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      domain TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS target_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      domain TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS hubspot_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      hub_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS pipedrive_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      api_domain TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS saved_outreach (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prospect_id TEXT NOT NULL,
      tone TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, prospect_id, tone),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS scan_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      breaches_found INTEGER DEFAULT 0,
      vendors_mapped INTEGER DEFAULT 0,
      prospects_identified INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const existing = await turso.execute("SELECT id FROM users WHERE email = 'demo@node0.io'");
  if (existing.rows.length === 0) {
    await turso.execute({
      sql: "INSERT INTO users (id, email, name, password_hash, company_name, industry, domain) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: ['1', 'demo@node0.io', 'operator', 'node0demo', 'SentinelShield', 'Cybersecurity', 'sentinelshield.io'],
    });

    const defaultTargets = [
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

    for (const t of defaultTargets) {
      await turso.execute({
        sql: "INSERT INTO target_accounts (id, user_id, name, domain, industry, source) VALUES (?, ?, ?, ?, ?, 'default')",
        args: [t.id, '1', t.name, t.domain, t.industry],
      });
    }
  }
}
