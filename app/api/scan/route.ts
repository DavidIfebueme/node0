import { NextRequest } from 'next/server';
import { detectBreaches, mapVendorNetwork, findCompaniesUsingVendor, identifyProspects } from '@/lib/brightdata';
import { getStore, startScan, completeScan } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const scan = startScan();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (stage: string, detail: string, progress: number) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ stage, detail, progress })}\n\n`));
      };

      try {
        send('init', 'initializing scan...', 5);

        const breaches = await detectBreaches((stage, detail) => {
          send(stage, detail, 15);
        });

        send('detect', `found ${breaches.length} breaches`, 25);

        for (let i = 0; i < breaches.length; i++) {
          const breach = breaches[i];
          const baseProgress = 25 + (i / Math.max(breaches.length, 1)) * 40;

          await mapVendorNetwork(breach, (stage, detail) => {
            send(stage, detail, baseProgress + 5);
          });

          const vendorRels = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId);
          const uniqueVendorIds = [...new Set(vendorRels.map(r => r.targetVendorId))];

          for (const vendorId of uniqueVendorIds) {
            await findCompaniesUsingVendor(vendorId, (stage, detail) => {
              send(stage, detail, baseProgress + 15);
            });
          }

          await identifyProspects(breach.id, (stage, detail) => {
            send(stage, detail, baseProgress + 25);
          });

          const mappedNodes = getStore().relationships.filter(r => r.sourceCompanyId === breach.companyId).length;
          const storedBreach = getStore().breaches.get(breach.id);
          if (storedBreach) storedBreach.mappedNodesCount = mappedNodes;
        }

        const finalStore = getStore();
        const totalProspects = finalStore.prospects.length;
        const totalVendors = finalStore.vendors.size;

        completeScan(scan.id, {
          breachesFound: breaches.length,
          vendorsMapped: totalVendors,
          prospectsIdentified: totalProspects,
        });

        send('complete', `scan complete: ${breaches.length} breaches, ${totalVendors} vendors, ${totalProspects} prospects`, 100);
      } catch (err) {
        console.error('scan error:', err);
        send('error', err instanceof Error ? err.message : 'scan failed', -1);
        completeScan(scan.id, { status: 'failed' });
      } finally {
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
