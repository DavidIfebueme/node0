'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getStraightPath, EdgeLabelRenderer } from '@xyflow/react';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: style?.stroke || '#1e1e2a', strokeWidth: 1 }} />
      <circle r={2} fill={style?.stroke === '#ff3b30' ? '#ff3b30' : '#00e5ff'} opacity={0.6}>
        <animateMotion
          dur={`${2 + Math.random() * 2}s`}
          repeatCount="indefinite"
          path={edgePath}
          begin={`${Math.random() * 2}s`}
        />
      </circle>
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              pointerEvents: 'all',
              fontSize: 9,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#6b7280',
              background: '#0d0d12',
              padding: '1px 4px',
              border: '1px solid #1e1e2a',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
