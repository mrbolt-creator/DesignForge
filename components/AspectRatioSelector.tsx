import React from 'react';
import { AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../constants';

interface AspectRatioSelectorProps {
    selected: AspectRatio;
    onSelect: (ratio: AspectRatio) => void;
    disabled?: boolean;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selected, onSelect, disabled = false }) => {
    return (
        <div className={`grid grid-cols-3 gap-2 ${disabled ? 'pointer-events-none' : ''}`}>
            {ASPECT_RATIOS.map((ratio) => (
                <button
                    key={ratio}
                    onClick={() => onSelect(ratio)}
                    disabled={disabled}
                    className={`flex-grow p-3 rounded-lg text-sm transition-all duration-200 border 
                    ${selected === ratio 
                        ? 'bg-lime-400 border-lime-400 text-black font-bold shadow-lg shadow-lime-500/20' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-lime-500 text-zinc-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {ratio}
                </button>
            ))}
        </div>
    );
};