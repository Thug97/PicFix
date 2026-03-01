import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function DropZone({ onImageSelect, compact = false, large = false }) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onImageSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onImageSelect(e.target.files[0]);
        }
    };

    return (
        <div className="relative group perspective-1000">
            {/* Animated Glowing Gradient Border Wrapper */}
            <div className={`absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 blur-sm opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${isDragging ? 'opacity-100 animate-pulse' : ''}`}></div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative w-full rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ease-out cursor-pointer overflow-hidden backdrop-blur-md border border-white/10
          ${large ? 'h-64' : compact ? 'h-32' : 'h-48'}
          ${isDragging
                        ? 'bg-amber-900/40 border-amber-400 shadow-[inset_0_0_30px_rgba(251,191,36,0.2)]'
                        : 'bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-400/50'
                    }`}
            >
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 block"
                />

                {/* Dropzone Inner Content */}
                <div className={`flex flex-col items-center pointer-events-none transform transition-transform duration-500 ${isDragging ? 'scale-110' : 'scale-100'}`}>
                    <div className={`rounded-full flex items-center justify-center mb-4 transition-colors duration-300
            ${isDragging ? 'bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'bg-white/5 group-hover:bg-amber-500/10'}
            ${compact ? 'w-10 h-10 mb-2' : 'w-16 h-16'}
          `}>
                        <UploadCloud
                            className={`transition-colors duration-300 
                ${isDragging ? 'text-amber-300' : 'text-slate-400 group-hover:text-amber-400'}
                ${compact ? 'w-5 h-5' : 'w-8 h-8'}
              `}
                            strokeWidth={1.5}
                        />
                    </div>

                    <p className={`text-slate-300 font-medium text-center px-6 ${compact ? 'text-xs' : 'text-sm'}`}>
                        <span className="text-amber-400 font-semibold">{isDragging ? 'Drop it here!' : 'Click or Drag'}</span>
                        {!compact && <><br /><span className="text-slate-500 font-normal mt-1 block">Supports PNG, JPG, WEBP</span></>}
                    </p>
                </div>
            </div>
        </div>
    );
}
