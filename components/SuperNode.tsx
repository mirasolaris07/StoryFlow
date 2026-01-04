
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';

export const SuperNode = memo(({ data, isConnectable }: NodeProps) => {
    const isExpanded = data.isExpanded ?? false;

    return (
        <div className={`shadow-2xl rounded-2xl border-2 transition-all duration-300 ${isExpanded
                ? 'w-[400px] h-[300px] bg-slate-900/90 border-indigo-500/50'
                : 'w-[200px] bg-indigo-900/20 border-indigo-500/30 backdrop-blur-md'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-indigo-500/20 bg-indigo-950/50 rounded-t-xl cursor-pointer hover:bg-indigo-900/50 transition-colors"
                onClick={() => data.onToggleExpand?.()}>
                <div className="flex items-center gap-2 text-indigo-300">
                    <Folder size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">{data.title || 'Route Group'}</span>
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>

            {/* Content */}
            <div className="p-4">
                {isExpanded ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs italic">
                        <p>Inner Branch Logic Placeholder</p>
                        <p>(Dragging nodes inside not yet supported)</p>
                    </div>
                ) : (
                    <div className="text-[10px] text-indigo-400/60 p-1">
                        {data.description || 'Contains multiple nodes...'}
                    </div>
                )}
            </div>

            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" />
        </div>
    );
});
