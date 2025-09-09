import React from 'react';
import { ImageData } from '../types';

interface DownloadMenuProps {
    image: ImageData;
    onEnhanceAndDownload: (image: ImageData) => void;
    onClose: () => void;
    className?: string;
}

export const DownloadMenu: React.FC<DownloadMenuProps> = ({ image, onEnhanceAndDownload, onClose, className = "" }) => {
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
                    onEnhanceAndDownload(image);
                    onClose();
                }}
                className="block w-full text-left px-3 py-2 text-sm rounded-md text-zinc-200 hover:bg-lime-500 hover:text-black transition-colors"
            >
                High Quality (HD)
            </button>
        </div>
    );
};