import React, { useState, useEffect } from 'react';
import { LogicCondition, Attribute, Character } from '../types';
import { Plus, Trash2, ChevronRight, ChevronDown, Code, CheckCircle, AlertCircle } from 'lucide-react';

interface ConditionBuilderProps {
    condition: LogicCondition;
    attributes: Attribute[];
    characters: Character[];
    onChange: (updated: LogicCondition) => void;
    onDelete?: () => void;
    depth?: number;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ condition, attributes, characters, onChange, onDelete, depth = 0 }) => {
    const isGroup = condition.type === 'GROUP';
    const isExpression = condition.type === 'EXPRESSION';
    const [isValid, setIsValid] = useState(true);

    // Expression Validation
    useEffect(() => {
        if (isExpression && condition.expression) {
            try {
                // Verify basic syntax by creating a function with dummy keys
                const mockKeys = attributes.map(a => a.key);
                new Function(...mockKeys, `return ${condition.expression}`);
                setIsValid(true);
            } catch (e) {
                setIsValid(false);
            }
        }
    }, [condition.expression, isExpression, attributes]);

    const handleAddCondition = () => {
        if (!condition.conditions) return;
        const newCond: LogicCondition = {
            id: `cond-${Date.now()}`,
            type: 'STATEMENT',
            scope: 'GAME',
            targetId: 'GAME',
            comparison: '>',
            value: 0
        };
        onChange({ ...condition, conditions: [...condition.conditions, newCond] });
    };

    const handleAddGroup = () => {
        if (!condition.conditions) return;
        const newGroup: LogicCondition = {
            id: `group-${Date.now()}`,
            type: 'GROUP',
            operator: 'AND',
            conditions: []
        };
        onChange({ ...condition, conditions: [...condition.conditions, newGroup] });
    };

    const handleAddExpression = () => {
        if (!condition.conditions) return;
        const newExpr: LogicCondition = {
            id: `expr-${Date.now()}`,
            type: 'EXPRESSION',
            expression: ''
        };
        onChange({ ...condition, conditions: [...condition.conditions, newExpr] });
    };

    const updateChild = (idx: number, updatedChild: LogicCondition) => {
        if (!condition.conditions) return;
        const newConditions = [...condition.conditions];
        newConditions[idx] = updatedChild;
        onChange({ ...condition, conditions: newConditions });
    };

    const deleteChild = (idx: number) => {
        if (!condition.conditions) return;
        const newConditions = condition.conditions.filter((_, i) => i !== idx);
        onChange({ ...condition, conditions: newConditions });
    };

    // Filter attributes based on selection
    const availableAttributes = attributes.filter(a => {
        if (condition.scope === 'GAME') return a.type === 'GAME';
        if (condition.scope === 'CHARACTER') return a.type === 'CHARACTER';
        return true;
    });

    if (isGroup) {
        return (
            <div className={`flex flex-col gap-2 p-3 rounded-xl border ${depth % 2 === 0 ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-slate-700/50'}`}>
                <div className="flex items-center gap-2">
                    <select
                        value={condition.operator}
                        onChange={(e) => onChange({ ...condition, operator: e.target.value as any })}
                        className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded px-2 py-1 border border-indigo-500/30 outline-none uppercase tracking-wider"
                    >
                        <option value="AND">ALL (AND)</option>
                        <option value="OR">ANY (OR)</option>
                    </select>
                    <div className="flex-1" />
                    <div className="flex gap-1">
                        <button onClick={handleAddCondition} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400" title="Add Rule"><Plus size={14} /></button>
                        <button onClick={handleAddExpression} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400" title="Add Expression"><Code size={14} /></button>
                        <button onClick={handleAddGroup} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400" title="Add Group"><ChevronDown size={14} /></button>
                        {onDelete && <button onClick={onDelete} className="p-1 hover:bg-rose-500/20 rounded text-slate-500 hover:text-rose-500"><Trash2 size={14} /></button>}
                    </div>
                </div>

                <div className="flex flex-col gap-2 pl-2 border-l border-slate-700/50">
                    {condition.conditions?.map((child, idx) => (
                        <ConditionBuilder
                            key={child.id}
                            condition={child}
                            attributes={attributes}
                            characters={characters}
                            onChange={(c) => updateChild(idx, c)}
                            onDelete={() => deleteChild(idx)}
                            depth={depth + 1}
                        />
                    ))}
                    {(!condition.conditions || condition.conditions.length === 0) && (
                        <div className="text-[10px] text-slate-600 italic px-2 py-1">No rules...</div>
                    )}
                </div>
            </div>
        );
    }

    if (isExpression) {
        return (
            <div className={`flex items-center gap-2 p-2 bg-slate-950 border rounded-lg group ${isValid ? 'border-slate-800' : 'border-rose-500/50'}`}>
                <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-500/10 text-purple-400">
                    <Code size={12} />
                </div>
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={condition.expression || ''}
                        onChange={(e) => onChange({ ...condition, expression: e.target.value })}
                        className="w-full bg-transparent text-[10px] text-purple-200 font-mono outline-none placeholder:text-slate-600"
                        placeholder="(gold > 10 && karma < 5) || special_item"
                    />
                    {!isValid && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-rose-500"><AlertCircle size={12} /></span>
                    )}
                </div>
                {onDelete && <button onClick={onDelete} className="text-slate-600 hover:text-rose-500 self-center p-1"><Trash2 size={12} /></button>}
            </div>
        )
    }

    // STATEMENT RENDER
    return (
        <div className="flex items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg group">
            <div className="flex flex-col gap-1 flex-1">
                <div className="flex gap-1">
                    {/* SCOPE SELECTOR */}
                    <select
                        value={condition.scope || 'GAME'}
                        onChange={(e) => onChange({ ...condition, scope: e.target.value as any, targetId: e.target.value === 'GAME' ? 'GAME' : (characters[0]?.id || '') })}
                        className="bg-slate-900 text-[9px] text-slate-400 rounded px-1 py-1 border border-slate-800 outline-none w-16"
                    >
                        <option value="GAME">Game</option>
                        <option value="CHARACTER">Char</option>
                    </select>

                    {/* TARGET SELECTOR (Only if Character) */}
                    {condition.scope === 'CHARACTER' && (
                        <select
                            value={condition.targetId || ''}
                            onChange={(e) => onChange({ ...condition, targetId: e.target.value })}
                            className="bg-slate-900 text-[9px] text-amber-500 font-bold rounded px-1 py-1 border border-slate-800 outline-none flex-1"
                        >
                            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>

                <div className="flex gap-1">
                    {/* ATTRIBUTE SELECTOR */}
                    <select
                        value={condition.attributeId || ''}
                        onChange={(e) => onChange({ ...condition, attributeId: e.target.value })}
                        className="bg-slate-900 text-[9px] text-blue-400 font-medium rounded px-1 py-1 border border-slate-800 outline-none flex-1"
                    >
                        <option value="" disabled>Select Attr...</option>
                        {attributes.filter(a => a.type === (condition.scope || 'GAME')).map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>

                    {/* OPERATOR */}
                    <select
                        value={condition.comparison || '>'}
                        onChange={(e) => onChange({ ...condition, comparison: e.target.value as any })}
                        className="bg-slate-900 text-[9px] text-slate-300 rounded px-1 py-1 border border-slate-800 outline-none w-10 text-center"
                    >
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="==">=</option>
                        <option value="!=">!=</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                    </select>

                    {/* VALUE */}
                    <input
                        type="number"
                        value={condition.value || 0}
                        onChange={(e) => onChange({ ...condition, value: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-900 text-[9px] text-emerald-400 font-bold rounded px-1 py-1 border border-slate-800 outline-none w-12 text-center"
                    />
                </div>
            </div>

            {onDelete && <button onClick={onDelete} className="text-slate-600 hover:text-rose-500 self-center p-1"><Trash2 size={12} /></button>}
        </div>
    );
};
