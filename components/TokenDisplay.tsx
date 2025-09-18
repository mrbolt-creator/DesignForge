import React from 'react';
import { Icon } from './Icon';

interface TokenDisplayProps {
    remaining: number;
    total: number;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({ remaining, total }) => {
    const percentage = total > 0 ? (remaining / total) * 100 : 0;

    return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 w-full max-w-xs animate-fade-in">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Icon name="zap" className="w-4 h-4 text-lime-400" />
                    Daily Free Generations
                </span>
                <span className="text-sm font-bold text-lime-400">{remaining} / {total}</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2.5">
                <div 
                    className="bg-lime-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};
