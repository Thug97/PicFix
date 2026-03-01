import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DropZone from './components/DropZone';
import PresetSelector from './components/PresetSelector';
import Controls from './components/Controls';
import CanvasPreview from './components/CanvasPreview';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [activePreset, setActivePreset] = useState('landscape');
  const [targetWidth, setTargetWidth] = useState(1080);
  const [targetHeight, setTargetHeight] = useState(566);

  const [customDimensions, setCustomDimensions] = useState({ width: 1080, height: 1080 });

  const [bgColor, setBgColor] = useState('#000000');
  const [blurBg, setBlurBg] = useState(false);
  const [scaleZoom, setScaleZoom] = useState(false);
  const [stretchToFill, setStretchToFill] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState(0.1); // Default low compression

  const handleImageSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImageSrc(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (id, w, h) => {
    setActivePreset(id);
    if (id !== 'custom') {
      setTargetWidth(w);
      setTargetHeight(h);
    } else {
      setTargetWidth(customDimensions.width);
      setTargetHeight(customDimensions.height);
    }
  };

  useEffect(() => {
    if (activePreset === 'custom') {
      setTargetWidth(customDimensions.width);
      setTargetHeight(customDimensions.height);
    }
  }, [customDimensions, activePreset]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col font-sans overflow-x-hidden relative selection:bg-amber-500/30">

      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Color Blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/20 blur-[150px] rounded-full animate-blob opacity-70 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-600/20 blur-[150px] rounded-full animate-blob opacity-50 mix-blend-screen" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-yellow-500/10 blur-[120px] rounded-full animate-blob opacity-40 mix-blend-screen" style={{ animationDelay: '4s' }} />

        {/* Left Side Decoration: Vertical Text */}
        <div className="hidden 2xl:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col items-center gap-12 opacity-20">
          <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-amber-500 to-transparent" />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-[0.5em] font-mono text-amber-500 uppercase text-xs">PicFix Engine</span>
          <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-amber-500 to-transparent" />
        </div>

        {/* Right Side Decoration: Geometric accents */}
        <div className="hidden 2xl:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col items-end gap-16 opacity-20">
          <div className="flex gap-4">
            <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />
            <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />
            <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />
          </div>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-orange-500" />
          <div className="flex flex-col gap-4">
            <div className="w-4 h-[1px] bg-amber-500 ml-auto" />
            <div className="w-8 h-[1px] bg-amber-500 ml-auto" />
            <div className="w-2 h-[1px] bg-amber-500 ml-auto" />
          </div>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-orange-500" />
        </div>
      </div>

      <header className="w-full pt-12 pb-6 text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass-panel shadow-[0_0_40px_rgba(251,191,36,0.1)] relative group"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <Sparkles className="w-6 h-6 text-amber-400 relative z-10" strokeWidth={1.5} />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent transform tracking-tight text-glow-amber relative z-10">
            PicFix
          </h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-slate-400 mt-6 max-w-lg mx-auto text-lg font-light tracking-wide"
        >
          Processing done locally so your files dont leave the system. <span className="text-amber-400 font-medium">Privacy guaranteed!</span><br />Resize, refine, and download in seconds.
        </motion.p>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 z-10 relative max-w-7xl">
        <AnimatePresence mode="wait">
          {!imageSrc ? (
            <motion.div
              key="uploading-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <div className="glass-panel p-2 rounded-[2rem]">
                <div className="bg-[#020617]/50 rounded-[1.5rem] p-8 md:p-16 border border-white/5">
                  <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.2)] border border-white/10">
                      <ImageIcon className="w-10 h-10 text-amber-300" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Start Your Workspace</h2>
                    <p className="text-slate-400">Drag and drop any image below to begin processing.</p>
                  </div>
                  <DropZone onImageSelect={handleImageSelect} large />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workspace-state"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
            >
              {/* Left Column: UI Controls */}
              <div className="lg:col-span-4 space-y-6">

                <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                  <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></span>
                    Image Source
                  </h3>
                  <DropZone onImageSelect={handleImageSelect} compact />
                </div>

                <div className="glass-panel p-6 rounded-3xl">
                  <PresetSelector
                    activePreset={activePreset}
                    onSelectPreset={handlePresetSelect}
                  />
                </div>

                <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                  <Controls
                    bgColor={bgColor} setBgColor={setBgColor}
                    blurBg={blurBg} setBlurBg={setBlurBg}
                    scaleZoom={scaleZoom} setScaleZoom={setScaleZoom}
                    stretchToFill={stretchToFill} setStretchToFill={setStretchToFill}
                    compressionLevel={compressionLevel} setCompressionLevel={setCompressionLevel}
                    customDimensions={customDimensions} setCustomDimensions={setCustomDimensions}
                    activePreset={activePreset}
                  />
                </div>
              </div>

              {/* Right Column: Canvas Preview area */}
              <div className="lg:col-span-8 h-full">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                  className="glass-panel p-2 rounded-3xl h-full flex flex-col min-h-[600px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/20 border-l-white/20"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] rounded-t-[1.3rem]">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                      <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                      <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                    </div>
                    <div className="text-xs font-mono text-slate-500 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                      {targetWidth} × {targetHeight}
                    </div>
                  </div>

                  <div className="flex-grow p-6 flex flex-col justify-center relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0idHJhbnNwYXJlbnQiPjwvcmVjdD4KPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiPjwvY2lyY2xlPgo8L3N2Zz4=')] rounded-b-[1.3rem]">
                    <CanvasPreview
                      imageSrc={imageSrc}
                      width={targetWidth}
                      height={targetHeight}
                      bgColor={bgColor}
                      blurBg={blurBg}
                      scaleZoom={scaleZoom}
                      stretchToFill={stretchToFill}
                      compressionLevel={compressionLevel}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm z-10 font-medium flex flex-col gap-1 items-center justify-center">
        <span>PicFix Engine</span>
        <span className="text-slate-400 text-xs tracking-wider">Created by Adithya</span>
      </footer>
    </div>
  );
}

export default App;
