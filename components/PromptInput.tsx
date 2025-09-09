import React, { useState } from 'react';

interface PromptInputProps {
    onPromptSubmit: (prompt: string) => void;
    placeholder: string;
    buttonText?: string;
    isStandalone?: boolean;
    prompt?: string;
    setPrompt?: (prompt: string) => void;
    isButtonDisabled?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
    onPromptSubmit,
    placeholder,
    buttonText = "Submit",
    isStandalone = false,
    prompt: externalPrompt,
    setPrompt: externalSetPrompt,
    isButtonDisabled
}) => {
    const [internalPrompt, setInternalPrompt] = useState('');
    
    const isControlled = externalPrompt !== undefined && externalSetPrompt !== undefined;
    const prompt = isControlled ? externalPrompt : internalPrompt;
    const setPrompt = isControlled ? externalSetPrompt : setInternalPrompt;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // The disabled state on the button should prevent this, but as a safeguard:
        if (isButtonDisabled) return;

        if (prompt.trim() || !isStandalone) { // Allow empty prompt submission if button is not disabled (for style changes)
            onPromptSubmit(prompt);
            if (!isControlled) {
                setInternalPrompt('');
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                className="w-full p-3 bg-zinc-800 border-2 border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition"
            />
            {!isStandalone && (
                 <button type="submit" disabled={isButtonDisabled ?? !prompt.trim()} className="w-full bg-lime-600 hover:bg-lime-500 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-lg transition-all duration-300">
                    {buttonText}
                </button>
            )}
        </form>
    );
};