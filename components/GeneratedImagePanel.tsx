import React, { useState } from 'react';
import { ImageData } from '../types';
import { Icon } from './Icon';
import { DownloadMenu } from './DownloadMenu';

interface GeneratedImagePanelProps {
    images: ImageData[];
    onEnhanceAndDownload: (image: ImageData) => void;
}

export const GeneratedImagePanel: React.FC<GeneratedImagePanelProps> = ({ images, onEnhanceAndDownload }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

    if (images.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up">
            <div className="w-full max-w-4xl mx-auto">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-zinc-900 text-white px-6 py-2 rounded-t-lg ml-4 flex items-center gap-2 font-semibold border-t border-l border-r border-lime-500/20"
                >
                    <Icon name="gallery" />
                    My Posters ({images.length})
                    <Icon name={isOpen ? 'chevron-down' : 'chevron-up'} className="w-5 h-5" />
                </button>
                {isOpen && (
                    <div className="bg-black/80 backdrop-blur-md border-t-2 border-lime-500 p-4 rounded-t-lg">
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {images.map((image, index) => (
                                <div key={index} className="flex-shrink-0 w-32 h-32 group relative">
                                    <img
                                        src={`data:${image.mimeType};base64,${image.base64}`}
                                        alt={`Generated Poster ${index + 1}`}
                                        className="w-full h-full object-cover rounded-md border-2 border-zinc-700"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="relative">
                                            <button 
                                               onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                                               className="p-2 bg-lime-500 rounded-full text-black hover:bg-lime-400 transition"
                                               title="Download Poster"
                                            >
                                               <Icon name="download" />
                                            </button>
                                            {openMenuIndex === index && (
                                                 <DownloadMenu
                                                    image={image}
                                                    onEnhanceAndDownload={onEnhanceAndDownload}
                                                    onClose={() => setOpenMenuIndex(null)}
                                                    className="bottom-full mb-2 right-1/2 translate-x-1/2 w-48"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};