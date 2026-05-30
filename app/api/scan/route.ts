import { NextRequest, NextResponse } from 'next/server';
import { scanForBreachRelevance, mapVendorNetwork, findCompaniesUsingVendor, identifyProspects, enrichCompanyWithLinkedIn } from '@/lib/brightdata';
import { getStore, startScan, completeScan, getProfile, getTargetAccounts, setCurrentUserId, saveScanState } from '@/lib/server-store';
import type { Breach } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const step = body.step;

  if (step !== 'full') {
    return NextResponse.json({ error: 'unknown step' }, { status: 400 });
  }

  const session = await (await import('@/lib/auth')).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  setCurrentUserId(userId);
  startScan();
  const scanStartedAt = new Date().toISOString();
  const targetIds: string[] | null = body.targetIds || null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      let heartbeat: NodeJS.Timeout | null = null;
      heartbeat = setInterval(() => {
        send('heartbeat', { ts: Date.now() });
      }, 5000);

      const stopHeartbeat = () => { if (heartbeat) clearInterval(heartbeat); };

      try {
        send('progress', { message: 'initializing scan...', progress: 2 });

        const profile = await getProfile();
        let targets = await getTargetAccounts();
        if (targetIds && targetIds.length > 0) {
          targets = targets.filter(t => targetIds.includes(t.id));
        }
        send('progress', { message: `scanning for breaches affecting ${profile.companyName}'s ${targets.length} targets...`, progress: 5 });

        let breaches: Breach[] = [];
        try {
          breaches = await scanForBreachRelevance((stage, detail) => {
            const pct = stage === 'detect' ? Math.min(20, 5 + Math.random() * 10) : 15;
            send('progress', { message: detail, progress: Math.round(pct) });
          }, targetIds);
        } catch (err) {
          send('progress', { message: 'discovery phase partially failed, using available results...', progress: 20 });
        }

        if (breaches.length === 0) {
          const existingCount = getStore().breaches.size;
          if (existingCount > 0) {
            send('progress', { message: `no new breaches found — ${existingCount} existing breaches retained from previous scans`, progress: 100 });
          } else {
            send('progress', { message: 'no breaches found — try adjusting targets or scan again later', progress: 100 });
          }
          stopHeartbeat();
          controller.close();
          return;
        }

        send('progress', { message: `found ${breaches.length} breaches`, progress: 25 });

        const allBreaches: Record<string, unknown>[] = [];

        for (let i = 0; i < breaches.length; i++) {
          const breach = breaches[i];
          const baseProgress = 25 + (i / Math.max(breaches.length, 1)) * 60;

          const alreadyMapped = getStore().relationships.some(r => r.sourceCompanyId === breach.companyId);
          if (alreadyMapped) {
            send('progress', { message: `${breach.companyName} already mapped — skipping`, progress: baseProgress + 5 });
            const breachProspects = getStore().prospects.filter(p => p.breachId === breach.id);
            allBreaches.push({
              id: breach.id,
              title: breach.title,
              description: breach.description,
              severity: breach.severity,
              breachType: breach.breachType,
              detectedAt: breach.detectedAt,
              companyId: breach.companyId,
              companyName: breach.companyName,
              mappedNodesCount: breach.mappedNodesCount,
            });
            send('breach', { breach: allBreaches[allBreaches.length - 1] });
            if (breachProspects.length > 0) {
              send('prospects', { prospects: breachProspects });
            }
            continue;
          }

          send('progress', { message: `mapping ${breach.companyName} vendor network...`, progress: baseProgress + 5 });

          try {
            await enrichCompanyWithLinkedIn(breach.companyName, `${breach.companyName.toLowerCase().replace(/\s+/g, '')}.com`, (stage, detail) => {
              send('progress', { message: detail, progress: baseProgress + 7 });
            });
          } catch {}

          try {
            await mapVendorNetwork(breach, (stage, detail) => {
              send('progress', { message: detail, progress: baseProgress + 10 });
            });
          } catch {
            send('progress', { message: `vendor mapping for ${breach.companyName} partially failed`, progress: baseProgress + 10 });
          }

          const vendorRels = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId);
          const uniqueVendorIds = [...new Set(vendorRels.map(r => r.targetVendorId))].slice(0, 2);

          for (const vendorId of uniqueVendorIds) {
            try {
              await findCompaniesUsingVendor(vendorId, (stage, detail) => {
                send('progress', { message: detail, progress: baseProgress + 20 });
              });
            } catch {}
          }

          try {
            await identifyProspects(breach.id, (stage, detail) => {
              send('progress', { message: detail, progress: baseProgress + 25 });
            });
          } catch {}

          const mappedNodes = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId).length;
          const storedBreach = getStore().breaches.get(breach.id);
          if (storedBreach) storedBreach.mappedNodesCount = mappedNodes;

          const breachProspects = getStore().prospects.filter(p => p.breachId === breach.id);

          allBreaches.push({
            id: breach.id,
            title: breach.title,
            description: breach.description,
            severity: breach.severity,
            breachType: breach.breachType,
            detectedAt: breach.detectedAt,
            companyId: breach.companyId,
            companyName: breach.companyName,
            mappedNodesCount: mappedNodes,
          });

          send('breach', { breach: allBreaches[allBreaches.length - 1] });
          if (breachProspects.length > 0) {
            send('prospects', { prospects: breachProspects });
          }
        }

        const finalStore = getStore();
        const totalProspects = finalStore.prospects.length;
        const totalVendors = finalStore.vendors.size;

        completeScan('latest', {
          breachesFound: breaches.length,
          vendorsMapped: totalVendors,
          prospectsIdentified: totalProspects,
        });

        try {
          const { getTurso } = await import('@/lib/turso');
          const turso = getTurso();
          const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const session = await (await import('@/lib/auth')).auth();
          const userId = session?.user?.id;
          if (userId) {
            await turso.execute({
              sql: "INSERT INTO scan_history (id, user_id, status, breaches_found, vendors_mapped, prospects_identified, started_at, completed_at) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?)",
              args: [scanId, userId, breaches.length, totalVendors, totalProspects, scanStartedAt, new Date().toISOString()],
            });
          }
        } catch {}

        try {
          await saveScanState();
        } catch {}

        send('progress', { message: `scan complete — ${allBreaches.length} breaches, ${finalStore.vendors.size} vendors, ${finalStore.prospects.length} prospects`, progress: 100 });
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'scan failed' });
      } finally {
        stopHeartbeat();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
