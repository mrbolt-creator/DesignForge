import React from 'react';
import { VisualStyle } from '../types';
import { VISUAL_STYLES } from '../constants';

interface StyleSelectorProps {
    selected: VisualStyle;
    onSelect: (style: VisualStyle) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selected, onSelect }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {VISUAL_STYLES.map((style) => (
                <button
                    key={style}
                    onClick={() => onSelect(style)}
                    className={`flex-grow p-2 rounded-lg text-xs sm:text-sm transition-all duration-200 border text-center 
                    ${selected === style 
                        ? 'bg-lime-400 border-lime-400 text-black font-bold shadow-lg shadow-lime-500/20' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-lime-500 text-zinc-300'}`}
                >
                    {style}
                </button>
            ))}
        </div>
    );
};