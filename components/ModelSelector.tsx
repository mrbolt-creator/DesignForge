import React from 'react';
import { ImageGenerationModel } from '../types';
import { IMAGE_GENERATION_MODELS } from '../constants';

interface ModelSelectorProps {
    selected: ImageGenerationModel;
    onSelect: (model: ImageGenerationModel) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selected, onSelect }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {IMAGE_GENERATION_MODELS.map((model) => (
                <button
                    key={model}
                    onClick={() => onSelect(model)}
                    className={`flex-grow p-2 rounded-lg text-xs sm:text-sm transition-all duration-200 border text-center 
                    ${selected === model 
                        ? 'bg-lime-400 border-lime-400 text-black font-bold shadow-lg shadow-lime-500/20' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-lime-500 text-zinc-300'}`}
                >
                    {model}
                </button>
            ))}
        </div>
    );
};