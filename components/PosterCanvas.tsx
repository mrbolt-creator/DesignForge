import React, { useState, useRef, useEffect } from 'react';
import { ImageData } from '../types';
import { Icon } from './Icon';
import { DownloadMenu } from './DownloadMenu';

interface PosterCanvasProps {
    posters: ImageData[];
    onAddToPanel: (image: ImageData) => void;
    onEnhanceAndDownload: (image: ImageData) => void;
    onClose?: () => void;
    selectedIndex?: number;
    onSelectIndex?: (index: number) => void;
    onGenerateAdCopy?: (image: ImageData) => void;
    adCopy?: string | null;
    onClearAdCopy?: () => void;
    remainingGenerations?: number;
}

export const PosterCanvas: React.FC<PosterCanvasProps> = ({ posters, onAddToPanel, onEnhanceAndDownload, onClose, selectedIndex, onSelectIndex, onGenerateAdCopy, adCopy, onClearAdCopy, remainingGenerations }) => {
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const [internalIndex, setInternalIndex] = useState(0);
    const isControlled = selectedIndex !== undefined && onSelectIndex !== undefined;
    const currentIndex = isControlled ? selectedIndex : internalIndex;
    const setCurrentIndex = isControlled ? onSelectIndex! : setInternalIndex;

    const selectedImage = posters[currentIndex];

    // Reset zoom and pan when a new poster is selected or posters array changes
    useEffect(() => {
        setTransform({ scale: 1, x: 0, y: 0 });
    }, [currentIndex, posters]);

     // If not controlled, reset index when posters array changes
    useEffect(() => {
        if (!isControlled) {
            setInternalIndex(0);
        }
    }, [posters, isControlled]);

    const zoomToPoint = (newScale: number, pointX: number, pointY: number) => {
        const { scale, x, y } = transform;
        const newX = pointX - (pointX - x) * newScale / scale;
        const newY = pointY - (pointY - y) * newScale / scale;
        
        if (newScale === 1) {
            setTransform({ scale: 1, x: 0, y: 0 });
        } else {
            setTransform({ scale: newScale, x: newX, y: newY });
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!canvasRef.current) return;
        
        const { deltaY } = e;
        const zoomFactor = 1.1;
        const newScale = deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
        const clampedScale = Math.max(1, Math.min(newScale, 8));

        if (clampedScale === transform.scale) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        zoomToPoint(clampedScale, mouseX, mouseY);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (transform.scale <= 1 && isPanning) return; // Prevent panning when not zoomed
        e.preventDefault();
        setIsPanning(true);
        setStartPanPosition({
            x: e.clientX - transform.x,
            y: e.clientY - transform.y,
        });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        setTransform((prev) => ({
            ...prev,
            x: e.clientX - startPanPosition.x,
            y: e.clientY - startPanPosition.y,
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };
    
    const handleZoomIn = () => {
        if (!canvasRef.current) return;
        const newScale = Math.min(transform.scale * 1.5, 8);
        const rect = canvasRef.current.getBoundingClientRect();
        zoomToPoint(newScale, rect.width / 2, rect.height / 2);
    };

    const handleZoomOut = () => {
        if (!canvasRef.current) return;
        const newScale = Math.max(1, transform.scale / 1.5);
        const rect = canvasRef.current.getBoundingClientRect();
        zoomToPoint(newScale, rect.width / 2, rect.height / 2);
    };

    const handleResetZoom = () => {
        setTransform({ scale: 1, x: 0, y: 0 });
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (selectedImage) {
            e.dataTransfer.setData('application/json', JSON.stringify(selectedImage));
        }
    };

    const handleDropOnPanel = () => {
        if (selectedImage) {
            onAddToPanel(selectedImage);
        }
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % posters.length);
    };

    if (!selectedImage) return null;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in relative group">
            <div
                ref={canvasRef}
                className="w-full flex-1 flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isPanning ? 'grabbing' : transform.scale > 1 ? 'grab' : 'default' }}
            >
                <img
                    src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`}
                    alt="Generated Poster"
                    className="object-contain rounded-lg shadow-2xl shadow-black/50"
                    style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                        pointerEvents: 'none',
                    }}
                    draggable="false"
                />
            </div>

            {/* Pagination Controls and Thumbnails */}
            {posters.length > 1 && (
                <div className="flex-shrink-0 pt-4 flex flex-col items-center gap-4">
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handlePrevious}
                            className="p-2 bg-zinc-800 rounded-full text-white hover:bg-lime-500 hover:text-black transition-all duration-200"
                            title="Previous variation"
                            aria-label="Previous variation"
                        >
                            <Icon name="chevron-left" className="w-6 h-6" />
                        </button>
                        <span className="font-semibold text-zinc-300 text-lg w-16 text-center">{currentIndex + 1} / {posters.length}</span>
                        <button
                            onClick={handleNext}
                            className="p-2 bg-zinc-800 rounded-full text-white hover:bg-lime-500 hover:text-black transition-all duration-200"
                            title="Next variation"
                            aria-label="Next variation"
                        >
                            <Icon name="chevron-right" className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Thumbnails */}
                    <div className="flex justify-center items-center gap-2 bg-black/20 p-2 rounded-xl">
                        {posters.map((img, index) => (
                            <button 
                                key={index} 
                                onClick={() => setCurrentIndex(index)}
                                className={`w-16 h-16 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-lime-400 ${currentIndex === index ? 'ring-2 ring-lime-400' : 'ring-2 ring-transparent hover:ring-zinc-600'}`}
                                title={`View variation ${index + 1}`}
                                aria-label={`Select variation ${index + 1}`}
                            >
                                <img
                                    src={`data:${img.mimeType};base64,${img.base64}`}
                                    alt={`Variation ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Right Controls */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {onGenerateAdCopy && (
                    <button
                        onClick={() => onGenerateAdCopy(selectedImage)}
                        className="p-3 bg-zinc-900/80 rounded-full text-white hover:bg-lime-500 hover:text-black transition-all cursor-pointer"
                        title="Generate Ad Copy"
                    >
                        <Icon name="ad-copy" className="w-5 h-5" />
                    </button>
                )}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-3 bg-zinc-900/80 rounded-full text-white hover:bg-red-600 transition-all cursor-pointer"
                        title="Close Image"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                )}
                <div className="relative">
                    <button
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="p-3 bg-zinc-900/80 rounded-full text-white hover:bg-lime-500 hover:text-black transition-all cursor-pointer"
                        title="Download Poster"
                    >
                        <Icon name="download" className="w-5 h-5" />
                    </button>
                    {showQualityMenu && (
                        <DownloadMenu
                            image={selectedImage}
                            onEnhanceAndDownload={onEnhanceAndDownload}
                            onClose={() => setShowQualityMenu(false)}
                            className="top-full mt-2 right-0 w-48"
                            remainingGenerations={remainingGenerations}
                        />
                    )}
                </div>
                <div
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDropOnPanel}
                    className="p-3 bg-zinc-900/80 rounded-full text-white hover:bg-lime-500 hover:text-black transition-all cursor-grab"
                    title="Drag to add to My Posters panel"
                >
                    <Icon name="drag" className="w-5 h-5" />
                </div>
            </div>
            
            {/* Bottom Center Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/80 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <button onClick={handleZoomOut} className="p-2 text-white hover:text-lime-400 rounded-full transition" title="Zoom Out" disabled={transform.scale <= 1}>
                    <Icon name="zoom-out" className="w-5 h-5"/>
                </button>
                <button onClick={handleResetZoom} className="p-2 text-white hover:text-lime-400 rounded-full transition" title="Reset View">
                    <Icon name="ratio" className="w-5 h-5"/>
                </button>
                <button onClick={handleZoomIn} className="p-2 text-white hover:text-lime-400 rounded-full transition" title="Zoom In" disabled={transform.scale >= 8}>
                    <Icon name="zoom-in" className="w-5 h-5"/>
                </button>
            </div>

            {/* Ad Copy Modal */}
            {adCopy && onClearAdCopy && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 animate-fade-in p-4">
                    <div className="bg-zinc-900 border border-lime-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl shadow-lime-900/50">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-xl font-bold text-lime-400 flex items-center gap-2"><Icon name="ad-copy" /> Generated Ad Copy</h3>
                            <button
                                onClick={onClearAdCopy}
                                className="p-2 bg-zinc-800 rounded-full text-white hover:bg-red-600 transition-all cursor-pointer"
                                title="Close"
                            >
                                <Icon name="close" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2 flex-1">
                            <pre className="text-zinc-300 whitespace-pre-wrap font-sans text-sm">{adCopy}</pre>
                        </div>
                        <button
                            onClick={() => {
                                if (adCopy) navigator.clipboard.writeText(adCopy);
                            }}
                            className="mt-4 flex-shrink-0 w-full bg-lime-600 hover:bg-lime-500 text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <Icon name="clipboard" className="w-5 h-5" /> Copy to Clipboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};