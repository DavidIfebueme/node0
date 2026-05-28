'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Crosshair } from 'lucide-react';

export function OriginNode({ data }: { data: any }) {
  return (
    <div className="relative flex flex-col items-center justify-center min-w-[120px] p-4 bg-bg-surface border border-accent-red group">
      <div className="absolute inset-0 border border-accent-red custom-pulse-red rounded-full scale-[1.5] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 border border-t-accent-red border-r-transparent border-b-transparent border-l-transparent rounded-full scale-[1.3] animate-spin pointer-events-none" style={{ animationDuration: '4s' }} />
      <Crosshair className="text-accent-red mb-2" size={24} />
      <span className="text-text-primary font-bold tracking-wider">{data.label}</span>
      <span className="text-[10px] text-accent-red mt-1">[{data.type}]</span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Top} className="opacity-0" />
    </div>
  );
}

export function VendorNode({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-bg-surface border border-border-default rotate-45 transform w-20 h-20 transition-colors group-hover:border-text-secondary">
      <div className="-rotate-45 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] text-text-secondary">VD</span>
        <span className="text-xs text-text-primary mt-1">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export function AffectedNode({ data }: { data: any }) {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-full border border-accent-orange/50 bg-bg-surface shadow-[0_0_10px_rgba(255,138,0,0.1)]">
      <span className="text-[10px] text-text-primary text-center px-1">{data.label}</span>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export function ProspectNode({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 border-accent-cyan bg-bg-surface shadow-[0_0_15px_rgba(0,229,255,0.2)] relative">
      <div className="absolute -top-1.5 -right-1.5 text-accent-cyan bg-bg-primary rounded-full">★</div>
      <span className="text-xs font-bold text-accent-cyan text-center px-1">{data.label}</span>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
