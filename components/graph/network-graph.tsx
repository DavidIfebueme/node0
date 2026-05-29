'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import { useStore } from '@/lib/store';
import { OriginNode, VendorNode, AffectedNode, ProspectNode } from './custom-nodes';
import { AnimatedEdge } from './custom-edges';
import type { VendorRelationship } from '@/lib/types';

const nodeTypes = {
  origin: OriginNode,
  vendor: VendorNode,
  affected: AffectedNode,
  prospect: ProspectNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

const FALLBACK_DATA = {
  nodes: [
    { id: 'n0', type: 'origin', position: { x: 0, y: 0 }, data: { label: 'Awaiting Scan', type: 'THIRD_PARTY' } },
  ],
  edges: [] as Array<{ id: string; source: string; target: string; animated?: boolean }>,
};

function buildGraphFromStore(
  breachId: string,
  breaches: Array<{ id: string; companyId: string; companyName: string; breachType: string }>,
  prospects: Array<{ id: string; companyId: string; companyName: string; breachId: string; connectionPath: Array<{ type: string; name: string }> }>,
) {
  const breach = breaches.find(b => b.id === breachId);
  if (!breach) return FALLBACK_DATA;

  const nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, string> }> = [];
  const edges: Array<{ id: string; source: string; target: string; animated?: boolean; label?: string; style?: Record<string, string> }> = [];

  nodes.push({
    id: `breach-${breach.id}`,
    type: 'origin',
    position: { x: 0, y: 0 },
    data: { label: breach.companyName, type: breach.breachType },
  });

  const breachProspects = prospects.filter(p => p.breachId === breachId);
  const vendorMap = new Map<string, string>();

  for (const p of breachProspects) {
    if (p.connectionPath[1]) {
      const vendorName = p.connectionPath[1].name;
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, `vn-${vendorName}`);
      }
    }
  }

  let vi = 0;
  for (const [vendorName, vendorNodeId] of vendorMap) {
    const angle = (2 * Math.PI * vi) / Math.max(vendorMap.size, 1) - Math.PI / 2;
    const radius = 250;
    vi++;
    nodes.push({
      id: vendorNodeId,
      type: 'vendor',
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      data: { label: vendorName },
    });
    edges.push({ id: `edge-breach-${vendorName}`, source: `breach-${breach.id}`, target: vendorNodeId, animated: true, label: 'uses', style: { stroke: '#ff3b30' } });
  }

  let pi = 0;
  for (const p of breachProspects) {
    const vendorName = p.connectionPath[1]?.name;
    const vendorNodeId = vendorMap.get(vendorName || '');
    if (!vendorNodeId) continue;

    const prospectNodeId = `prospect-${p.id}`;
    const angle = (2 * Math.PI * pi) / Math.max(breachProspects.length, 1) - Math.PI / 2;
    const radius = 450;
    pi++;

    nodes.push({
      id: prospectNodeId,
      type: 'prospect',
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      data: { label: p.companyName },
    });
    edges.push({ id: `edge-${vendorName}-${p.id}`, source: vendorNodeId, target: prospectNodeId, animated: true, label: 'exposed', style: { stroke: '#00e5ff' } });
  }

  return { nodes, edges };
}

export function NetworkGraph({ breachId }: { breachId: string }) {
  const { breaches, prospects } = useStore();

  const graphData = useMemo(
    () => buildGraphFromStore(breachId, breaches, prospects),
    [breachId, breaches, prospects]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<any>(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  useEffect(() => {
    setNodes(graphData.nodes);
  }, [graphData.nodes, setNodes]);

  useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = [];

    if (graphData.edges.length === 0) return;

    const vendorEdges = graphData.edges.filter(e => e.target.startsWith('vn-'));
    const prospectEdges = graphData.edges.filter(e => e.target.startsWith('prospect-'));

    timeoutIds.push(setTimeout(() => {
      setEdges(vendorEdges.map(e => ({ ...e, type: 'animated' })));
    }, 800));

    timeoutIds.push(setTimeout(() => {
      setEdges(prev => [
        ...prev,
        ...prospectEdges.map(e => ({ ...e, type: 'animated' }))
      ]);
    }, 2000));

    return () => timeoutIds.forEach(clearTimeout);
  }, [graphData.edges, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.5, minZoom: 0.5, maxZoom: 1.5 }}
      minZoom={0.2}
      maxZoom={2}
      className="bg-transparent"
      defaultEdgeOptions={{ type: 'animated', style: { strokeWidth: 1.5 } }}
    >
      <Background color="#14141c" variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-50" />
      <Controls
        showInteractive={false}
        className="!bg-bg-surface !border-border-default !rounded-none [&>button]:!bg-bg-surface [&>button]:!border-border-default [&>button]:!rounded-none [&>button]:!text-text-secondary [&>button:hover]:!bg-bg-elevated [&>button:hover]:!text-text-primary [&>svg]:!fill-text-secondary"
      />
    </ReactFlow>
  );
}
