import React from 'react';

interface VariationSelectorProps {
    selected: number;
    onSelect: (count: number) => void;
}

export const VariationSelector: React.FC<VariationSelectorProps> = ({ selected, onSelect }) => {
    const variations = [1, 2, 3, 4];
    return (
        <div className="grid grid-cols-4 gap-2">
            {variations.map((count) => (
                <button
                    key={count}
                    onClick={() => onSelect(count)}
                    className={`flex-grow p-3 rounded-lg text-sm transition-all duration-200 border font-semibold
                    ${selected === count 
                        ? 'bg-lime-400 border-lime-400 text-black shadow-lg shadow-lime-500/20' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-lime-500 text-zinc-300'}`}
                >
                    {count}
                </button>
            ))}
        </div>
    );
};