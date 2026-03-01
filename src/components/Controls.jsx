export default function Controls({
    bgColor,
    setBgColor,
    blurBg,
    setBlurBg,
    scaleZoom,
    setScaleZoom,
    stretchToFill,
    setStretchToFill,
    compressionLevel,
    setCompressionLevel,
    customDimensions,
    setCustomDimensions,
    activePreset
}) {

    // Toggle Switch Component
    const Toggle = ({ checked, onChange, disabled, colorClass, label, description }) => (
        <label className={`flex items-start gap-4 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="relative inline-flex items-center shrink-0 mt-0.5">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                {/* Track */}
                <div className={`w-11 h-6 rounded-full transition-colors duration-300 border border-white/10
                    ${checked ? colorClass : 'bg-slate-800/80 peer-focus:ring-2 peer-focus:ring-amber-400/30'}`}
                />
                {/* Thumb */}
                <div className={`absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300
                    ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-medium ${disabled ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-white transition-colors'}`}>
                    {label}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</span>
            </div>
        </label>
    );

    return (
        <div className="w-full space-y-6">
            <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></span>
                Configuration
            </h3>

            {activePreset === 'custom' && (
                <div className="flex gap-4 items-end bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner mb-6">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-2 uppercase">Width (px)</label>
                        <input type="number"
                            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner"
                            value={customDimensions.width}
                            onChange={e => setCustomDimensions({ ...customDimensions, width: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-2 uppercase">Height (px)</label>
                        <input type="number"
                            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all shadow-inner"
                            value={customDimensions.height}
                            onChange={e => setCustomDimensions({ ...customDimensions, height: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300">
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="absolute -inset-4 w-24 h-24 cursor-pointer opacity-0"
                            title="Choose background color"
                        />
                        <div className="w-full h-full pointer-events-none" style={{ backgroundColor: bgColor }} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-slate-200">Background Fill</label>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-1">{bgColor}</span>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <Toggle
                    checked={blurBg}
                    onChange={setBlurBg}
                    colorClass="bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                    label="Cinematic Blur"
                    description="Fills empty space with a glowing blurred version of your image."
                />

                <div className="h-px w-full bg-white/5 my-2" />

                <Toggle
                    checked={scaleZoom}
                    onChange={setScaleZoom}
                    disabled={stretchToFill}
                    colorClass="bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                    label="Zoom & Crop (Cover)"
                    description="Scales the image proportionally to completely fill the frame."
                />

                <Toggle
                    checked={stretchToFill}
                    onChange={setStretchToFill}
                    colorClass="bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                    label="Force Stretch"
                    description="Ignores original aspect ratio and force stretches the image to fit exactly."
                />

                <div className="h-px w-full bg-white/5 my-4" />

                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-200">Compression Level</label>
                        <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                            {Math.round(compressionLevel * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.0"
                        max="0.9"
                        step="0.1"
                        value={compressionLevel}
                        onChange={(e) => setCompressionLevel(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                    />
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Higher compression reduces file size but may introduce visual artifacts. Applies to exported WebP images.
                    </p>
                </div>
            </div>
        </div>
    );
}
