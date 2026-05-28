'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#1e1e2a', strokeWidth: 1 }} />
      <circle r={2} fill="#00e5ff" opacity={0.6}>
        <animateMotion
          dur={`${2 + Math.random() * 2}s`}
          repeatCount="indefinite"
          path={edgePath}
          begin={`${Math.random() * 2}s`}
        />
      </circle>
    </>
  );
}
