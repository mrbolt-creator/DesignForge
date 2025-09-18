import React from 'react';
import { ImageData } from '../types';

interface DownloadMenuProps {
    image: ImageData;
    onEnhanceAndDownload: (image: ImageData) => void;
    onClose: () => void;
    className?: string;
    remainingGenerations?: number;
}

export const DownloadMenu: React.FC<DownloadMenuProps> = ({ image, onEnhanceAndDownload, onClose, className = "", remainingGenerations }) => {
    const canEnhance = remainingGenerations === undefined || remainingGenerations >= 1;
    
    return (
        <div className={`absolute bg-zinc-900 border border-lime-500/30 rounded-lg shadow-lg z-10 p-2 animate-fade-in ${className}`}>
            <p className="text-xs text-zinc-400 px-2 pb-1 border-b border-zinc-700 mb-1">Download Quality</p>
            <a
                href={`data:${image.mimeType};base64,${image.base64}`}
                download={`poster-forge-std-${Date.now()}.png`}
                onClick={onClose}
                className="block w-full text-left px-3 py-2 text-sm rounded-md text-zinc-200 hover:bg-lime-500 hover:text-black transition-colors"
            >
                Standard
            </a>
            <button
                onClick={() => {
                    if (!canEnhance) return;
                    onEnhanceAndDownload(image);
                    onClose();
                }}
                disabled={!canEnhance}
                className="block w-full text-left px-3 py-2 text-sm rounded-md text-zinc-200 hover:bg-lime-500 hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:cursor-not-allowed"
            >
                High Quality (HD) <span className="text-xs text-zinc-500">(-1 Gen)</span>
            </button>
        </div>
    );
};
