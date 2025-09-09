import React, { useCallback, useState } from 'react';
import { ImageData } from '../types';
import { Icon } from './Icon';

interface ImageUploaderProps {
    onImageUpload: (image: ImageData) => void;
    label: string;
    compact?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label, compact = false }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = useCallback(async (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            try {
                const base64 = await fileToBase64(file);
                onImageUpload({ base64, mimeType: file.type });
            } catch (error) {
                console.error("Error converting file to base64", error);
            }
        }
    }, [onImageUpload]);

    const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); // Necessary to allow drop
    };
    const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    const classNames = compact
        ? `w-full text-center p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center ${isDragging ? 'border-lime-400 bg-lime-900/20' : 'border-zinc-700 bg-zinc-800 hover:border-lime-500 hover:bg-zinc-800/50'}`
        : `w-full text-center p-8 min-h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center ${isDragging ? 'border-lime-400 bg-lime-900/20' : 'border-zinc-700 bg-zinc-900 hover:border-lime-500 hover:bg-zinc-800/50'}`;

    return (
        <label
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={classNames}
        >
            <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => handleFileChange(e.target.files)}
            />
            <div className={`flex ${compact ? 'flex-row items-center justify-center gap-2' : 'flex-col items-center'}`}>
                <Icon name="upload" className={compact ? "w-5 h-5 text-zinc-400" : "w-10 h-10 mb-3 text-zinc-400"} />
                <p className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} text-zinc-300`}>{label}</p>
                {!compact && <p className="text-sm text-zinc-500 mt-1">PNG, JPG, WEBP</p>}
            </div>
        </label>
    );
};