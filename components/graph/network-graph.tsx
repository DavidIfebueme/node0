'use client';

import React, { useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import { getMockGraphData } from '@/lib/mock-data';
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

export function NetworkGraph({ breachId }: { breachId: string }) {
  const initialData = getMockGraphData(breachId);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = [];

    timeoutIds.push(setTimeout(() => {
      setEdges(initialData.edges
        .filter(e => e.target.startsWith('v'))
        .map(e => ({ ...e, type: 'animated' }))
      );
    }, 1000));

    timeoutIds.push(setTimeout(() => {
      setEdges(prev => [
        ...prev,
        ...initialData.edges
          .filter(e => e.target.startsWith('a'))
          .map(e => ({ ...e, type: 'animated' }))
      ]);
    }, 2000));

    timeoutIds.push(setTimeout(() => {
      setEdges(prev => [
        ...prev,
        ...initialData.edges
          .filter(e => e.target.startsWith('p'))
          .map(e => ({ ...e, type: 'animated' }))
      ]);
    }, 3000));

    return () => timeoutIds.forEach(clearTimeout);
  }, []);

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
