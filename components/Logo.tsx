import React from 'react';

export const Logo: React.FC = () => {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
                {/* The Logo Icon */}
                <div className="bg-lime-400 p-3 rounded-xl shadow-lg shadow-lime-500/20">
                    <svg
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-zinc-950"
                        fill="currentColor"
                    >
                        {/* Stylized 'F' that looks like a hammer */}
                        <path d="M14,4 H20 V8 H14 Z M6,4 H12 V12 H9 V20 H6 Z" />
                    </svg>
                </div>
                 <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wider">
                    Design<span className="text-lime-400">Forge</span>
                </h1>
            </div>
            <p className="text-zinc-400 text-sm">Your Vision, Perfectly Crafted</p>
        </div>
    );
};
