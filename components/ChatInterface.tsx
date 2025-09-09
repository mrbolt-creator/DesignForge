import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ImageData } from '../types';
import { Icon } from './Icon';
import { ImageUploader } from './ImageUploader';

interface ChatInterfaceProps {
    history: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string, image?: ImageData) => void;
    onUsePrompt: (prompt: string) => void;
    onCopyToClipboard: (prompt: string) => void;
    onGenerateImage: (prompt: string) => void;
}

const fileToBase64 = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            base64: (reader.result as string).split(',')[1],
            mimeType: file.type
        });
        reader.onerror = (error) => reject(error);
    });
};


const PromptBlock: React.FC<{ content: string; onUse: () => void; onCopy: () => void; onGenerate: () => void; }> = ({ content, onUse, onCopy, onGenerate }) => {
    return (
        <div className="bg-zinc-800/50 border border-lime-500/30 rounded-lg p-3 my-2">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{content}</p>
            <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-700">
                <button onClick={onCopy} className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-1 px-2 rounded-md transition flex items-center justify-center gap-1"><Icon name="clipboard" className="w-4 h-4" /> Copy</button>
                <button onClick={onUse} className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold py-1 px-2 rounded-md transition">Use Prompt</button>
                <button onClick={onGenerate} className="flex-1 text-xs bg-lime-600 hover:bg-lime-500 text-black font-semibold py-1 px-2 rounded-md transition">Generate Image</button>
            </div>
        </div>
    );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, isLoading, onSendMessage, onUsePrompt, onCopyToClipboard, onGenerateImage }) => {
    const [message, setMessage] = useState('');
    const [image, setImage] = useState<ImageData | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [history, isLoading]);
    
    const handleFileChange = async (files: FileList | null) => {
        if (files && files[0]) {
            try {
                const imageData = await fileToBase64(files[0]);
                setImage(imageData);
            } catch (error) {
                console.error("Error converting file:", error);
            }
        }
    };

    const handleSend = () => {
        if (isLoading || (!message.trim() && !image)) return;
        onSendMessage(message, image);
        setMessage('');
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const renderMessageContent = (text: string) => {
        const parts = text.split(/```(.*?)```/s);
        return parts.map((part, index) => {
            if (index % 2 === 1) { // This is the content within ```
                const promptContent = part.replace(/^prompt\n?/, '').trim();
                return <PromptBlock 
                            key={index} 
                            content={promptContent} 
                            onUse={() => onUsePrompt(promptContent)} 
                            onCopy={() => onCopyToClipboard(promptContent)} 
                            onGenerate={() => onGenerateImage(promptContent)}
                        />
            }
            return <p key={index} className="whitespace-pre-wrap">{part}</p>;
        });
    };

    return (
        <div className="flex flex-col flex-1 bg-zinc-900/50 rounded-lg p-3 min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {history.map((chat, index) => (
                    <div key={index} className={`flex gap-3 ${chat.role === 'user' ? 'justify-end' : ''}`}>
                        {chat.role === 'model' && <div className="w-8 h-8 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0"><Icon name="assistant" className="w-5 h-5 text-lime-300" /></div>}
                        <div className={`max-w-md rounded-lg px-4 py-2 ${chat.role === 'user' ? 'bg-lime-600/30 text-lime-100 rounded-br-none' : 'bg-zinc-800 text-zinc-300 rounded-bl-none'}`}>
                            {chat.parts.map((part, partIndex) => (
                                <div key={partIndex}>
                                    {part.image && <img src={`data:${part.image.mimeType};base64,${part.image.base64}`} className="rounded-md my-2 max-w-48 max-h-48" alt="User upload" />}
                                    {part.text && renderMessageContent(part.text)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0"><Icon name="assistant" className="w-5 h-5 text-lime-300" /></div>
                        <div className="bg-zinc-800 rounded-lg px-4 py-3">
                           <div className="flex items-center gap-2 text-zinc-400">
                               <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                               <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse delay-75"></div>
                               <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse delay-150"></div>
                           </div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 pt-3 border-t border-lime-500/20">
                {image && (
                    <div className="relative p-2">
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt="preview" className="w-16 h-16 rounded-md object-cover" />
                        <button onClick={() => setImage(null)} className="absolute top-0 right-0 w-6 h-6 bg-red-600/80 text-white rounded-full flex items-center justify-center text-xs">&times;</button>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                     <label className="p-2 text-zinc-400 hover:text-lime-400 cursor-pointer">
                        <Icon name="upload" className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} ref={fileInputRef} />
                     </label>
                     <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message or upload an image..."
                        rows={1}
                        className="flex-1 bg-transparent p-2 text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none"
                    />
                    <button onClick={handleSend} disabled={isLoading || (!message.trim() && !image)} className="p-2 rounded-full bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-600 text-black transition-colors">
                        <Icon name="send" className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};