'use client';

import React, { useEffect, useState } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import { getGraphData } from '@/lib/api';
import { OriginNode, VendorNode, AffectedNode, ProspectNode } from './custom-nodes';
import { AnimatedEdge } from './custom-edges';

const nodeTypes = {
  origin: OriginNode,
  vendor: VendorNode,
  affected: AffectedNode,
  prospect: ProspectNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, string>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const FALLBACK_DATA: GraphData = {
  nodes: [
    { id: 'n0', type: 'origin', position: { x: 0, y: 0 }, data: { label: 'Awaiting Scan', type: 'THIRD_PARTY' } },
  ],
  edges: [],
};

export function NetworkGraph({ breachId }: { breachId: string }) {
  const [graphData, setGraphData] = useState<GraphData>(FALLBACK_DATA);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(FALLBACK_DATA.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  useEffect(() => {
    getGraphData(breachId)
      .then(data => {
        if (data && data.nodes && data.nodes.length > 0) {
          setGraphData(data);
          setNodes(data.nodes);
        }
      })
      .catch(() => {});
  }, [breachId, setNodes]);

  useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = [];

    if (graphData.edges.length === 0) return;

    const vendorEdges = graphData.edges.filter(e => e.target.startsWith('vendor'));
    const companyEdges = graphData.edges.filter(e => e.target.startsWith('company'));

    timeoutIds.push(setTimeout(() => {
      setEdges(vendorEdges.map(e => ({ ...e, type: 'animated' })));
    }, 800));

    timeoutIds.push(setTimeout(() => {
      setEdges(prev => [
        ...prev,
        ...companyEdges.map(e => ({ ...e, type: 'animated' }))
      ]);
    }, 2000));

    return () => timeoutIds.forEach(clearTimeout);
  }, [graphData, setEdges]);

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
    >
      <Background color="#14141c" variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-50" />
    </ReactFlow>
  );
}
