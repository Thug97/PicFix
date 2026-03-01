import { Square, Monitor, Smartphone, Maximize } from 'lucide-react';

const PRESETS = [
    { id: 'landscape', label: 'Landscape', width: 1080, height: 566, icon: Monitor },
    { id: 'square', label: 'Square', width: 1080, height: 1080, icon: Square },
    { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, icon: Smartphone },
    { id: 'custom', label: 'Custom', width: 0, height: 0, icon: Maximize },
];

export default function PresetSelector({ activePreset, onSelectPreset }) {
    return (
        <div className="w-full">
            <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></span>
                Aspect Ratio
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESETS.map((preset) => {
                    const isActive = activePreset === preset.id;
                    const Icon = preset.icon;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => onSelectPreset(preset.id, preset.width, preset.height)}
                            className="relative group outline-none"
                        >
                            {/* Outer Glow */}
                            <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${isActive ? 'opacity-100 blur-[2px]' : ''}`} />

                            <div
                                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 overflow-hidden transform group-active:scale-95
                   ${isActive
                                        ? 'bg-gradient-to-b from-amber-900/40 to-slate-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border-transparent'
                                        : 'bg-white/[0.03] border border-white/5 group-hover:bg-white/[0.08] shadow-sm'}
                 `}
                            >
                                {/* Subtle shine effect on active */}
                                {isActive && <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />}

                                <Icon
                                    className={`w-6 h-6 mb-2 transition-colors duration-300 ${isActive ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-400 group-hover:text-amber-300/70'}`}
                                    strokeWidth={isActive ? 2 : 1.5}
                                />

                                <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {preset.label}
                                </span>

                                {preset.width > 0 && preset.height > 0 && (
                                    <span className={`text-[10px] mt-1 tracking-wider font-mono ${isActive ? 'text-amber-200/70' : 'text-slate-500'}`}>
                                        {preset.width}x{preset.height}
                                    </span>
                                )}
                                {preset.width === 0 && (
                                    <span className={`text-[10px] mt-1 tracking-wider font-mono ${isActive ? 'text-amber-200/70' : 'text-slate-500'}`}>
                                        Freeform
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
