# node0

breach intelligence for cybersecurity vendors.

detect breaches. map blast radii. engage prospects.

when a company gets breached, node0 traces the blast radius through shared vendor networks, identifies your sales prospects inside the affected zone, and generates ai-powered outreach — all in one pipeline.

## how it works

1. **discover** — bright data discover + serp api find breach incidents from across the web in real-time
2. **extract** — glm-4.5-air extracts structured breach data: company, type, severity, affected vendors
3. **enrich** — linkedin web scraper enriches breached companies with employee count, industry, description
4. **map** — web unlocker scrapes privacy policies + ai extraction maps the vendor network around each breach
5. **trace** — blast radius analysis traces which target accounts share vendors with breached companies
6. **engage** — glm-4.5-air generates targeted outreach emails with breach-specific context

## tech stack

### data acquisition
- **bright data discover** — real-time breach incident discovery via ai-powered web data engine
- **bright data web unlocker** — anti-bot bypass for privacy policy scraping and public document access
- **bright data serp api** — google search with tbm=nws for targeted breach news queries
- **bright data web scraper — linkedin** — company data enrichment: employee count, industry, description

### ai & intelligence
- **glm-4.5-air via ai/ml api** — structured extraction (breach data) + outreach generation (sales emails)
- false-positive filtering — regex + keyword scoring rejects reports and whitepapers that aren't real breaches

### persistence & auth
- **turso (libsql)** — edge-deployed sqlite for users, target accounts, pipedrive tokens, saved outreach, scan history
- **next-auth v5** — jwt-based credentials auth with turso-backed user store

### frontend & viz
- **next.js 15** — app router, server components, api routes, sse streaming for scan progress
- **reactflow** — interactive vendor network graph with breach origins, vendor nodes, affected companies, prospect targets
- **tailwind css v4** — terminal aesthetic: jetbrains mono, bracket nav, dark theme

### integrations
- **pipedrive crm** — oauth integration for contact sync and deal pipeline
- **vercel** — serverless deployment with edge-optimized api routes

## features

- real-time breach scanning with sse progress streaming
- vendor network graph visualization with animated edges and blast radius indicators
- ai-powered false-positive filtering (rejects reports, whitepapers, surveys)
- smart csv upload — auto-detects hubspot/salesforce export columns
- target account management with search, edit, delete, pagination
- scan history persisted across sessions
- pipedrive crm oauth connection
- ai outreach generation with copy + mailto actions

## running locally

**prerequisites:** node.js 18+

1. clone the repo:
   ```bash
   git clone https://github.com/DavidIfebueme/node0.git
   cd node0
   ```

2. install dependencies:
   ```bash
   npm install
   ```

3. copy the env file:
   ```bash
   cp .env.example .env.local
   ```

4. fill in your `.env.local` with the required values:
   ```env
   BRIGHT_DATA_API_KEY="your-bright-data-api-key"
   AIML_API_KEY="your-aiml-api-key"
   TURSO_DATABASE_URL="libsql://your-db.turso.io"
   TURSO_AUTH_TOKEN="your-turso-auth-token"
   PIPEDRIVE_CLIENT_ID="your-pipedrive-client-id"
   PIPEDRIVE_CLIENT_SECRET="your-pipedrive-client-secret"
   PIPEDRIVE_REDIRECT_URI="http://localhost:3000/api/crm/pipedrive/callback"
   AUTH_SECRET="generate-a-random-secret"
   AUTH_URL="http://localhost:3000"
   ```

5. run the app:
   ```bash
   npm run dev
   ```

6. open [http://localhost:3000](http://localhost:3000) and sign up

## architecture

```
user → next.js app router → api routes (sse streaming)
                              ├── bright data sdk (discover, serp, web unlocker, linkedin)
                              ├── glm-4.5-air (extraction + outreach)
                              ├── turso (persistence)
                              └── pipedrive oauth (crm sync)
```

## license

mit
