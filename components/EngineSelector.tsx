import React from 'react';

interface EngineSelectorProps<T extends string> {
    engines: readonly T[];
    selected: T;
    onSelect: (engine: T) => void;
}

export const EngineSelector = <T extends string>({ engines, selected, onSelect }: EngineSelectorProps<T>) => {
    return (
        <div className="flex flex-wrap gap-2">
            {engines.map((engine) => (
                <button
                    key={engine}
                    onClick={() => onSelect(engine)}
                    className={`flex-grow p-2 rounded-lg text-xs sm:text-sm transition-all duration-200 border text-center 
                    ${selected === engine 
                        ? 'bg-lime-400 border-lime-400 text-black font-bold shadow-lg shadow-lime-500/20' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-lime-500 text-zinc-300'}`}
                >
                    {engine}
                </button>
            ))}
        </div>
    );
};
