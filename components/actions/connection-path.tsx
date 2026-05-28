import React from 'react';

interface ConnectionPathProps {
  path: Array<{ type: string; name: string }>;
}

export function ConnectionPath({ path }: ConnectionPathProps) {
  return (
    <div className="flex flex-col gap-0 font-mono text-xs p-2 bg-bg-primary border border-border-muted">
      {path.map((node, i) => {
        const isFirst = node.type === 'COMPANY';
        const isLast = i === path.length - 1;
        const isVendor = node.type === 'VENDOR';

        return (
          <div key={i}>
            <div className="flex items-center gap-1.5">
              <span className={isFirst ? 'text-accent-red' : isLast ? 'text-accent-cyan' : 'text-text-secondary'}>
                {isFirst ? '▲' : isLast ? '▼' : '●'}
              </span>
              <span className={isFirst ? 'text-accent-red' : isLast ? 'text-accent-cyan' : 'text-text-secondary'}>
                {node.name}
              </span>
              {!isVendor && (
                <span className="text-text-dim text-[10px]">
                  {isFirst ? '(Breached)' : '(Exposure)'}
                </span>
              )}
            </div>
            {!isLast && isVendor && (
              <div className="ml-1.5 my-0.5 border-l border-border-muted pl-2 text-[10px] text-text-dim">
                │ via {node.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
