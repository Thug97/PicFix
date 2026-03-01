import { useEffect, useRef, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

export default function CanvasPreview({
    imageSrc,
    width,
    height,
    bgColor,
    blurBg,
    scaleZoom,
    stretchToFill,
    compressionLevel,
    onDownloadReady
}) {
    const canvasRef = useRef(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [justDownloaded, setJustDownloaded] = useState(false);

    useEffect(() => {
        if (!imageSrc || !width || !height) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Set actual canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // 1. Fill base Background Color
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            // 2. Draw Blurred bg if needed (and not scaleZooming/stretching)
            if (blurBg && !scaleZoom && !stretchToFill) {
                // Calculate dimensions to cover canvas
                const scaleX = width / img.width;
                const scaleY = height / img.height;
                const scale = Math.max(scaleX, scaleY); // cover

                const dw = img.width * scale;
                const dh = img.height * scale;
                const dx = (width - dw) / 2;
                const dy = (height - dh) / 2;

                // Stronger blur for cinematic feel
                ctx.filter = 'blur(40px) saturate(150%) brightness(80%)';
                ctx.drawImage(img, dx, dy, dw, dh);

                // Add a very slight dark gradient overlay overlay for better contrast
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                ctx.filter = 'none'; // reset
            }

            // 3. Draw main image logic
            let dx = 0, dy = 0, dw = width, dh = height;

            if (stretchToFill) {
                // Ignore aspect ratio, stretch to fill exactly
                dw = width;
                dh = height;
                dx = 0;
                dy = 0;
            } else if (scaleZoom) {
                // Object-cover equivalent: Fit by overlapping
                const scaleX = width / img.width;
                const scaleY = height / img.height;
                const scale = Math.max(scaleX, scaleY);

                dw = img.width * scale;
                dh = img.height * scale;
                dx = (width - dw) / 2;
                dy = (height - dh) / 2;
            } else {
                // Object-contain equivalent: Fit inside
                const scaleX = width / img.width;
                const scaleY = height / img.height;
                const scale = Math.min(scaleX, scaleY);

                dw = img.width * scale;
                dh = img.height * scale;
                dx = (width - dw) / 2;
                dy = (height - dh) / 2;
            }

            // Draw shadow for the main image to detach it from background if contained
            if (!stretchToFill && !scaleZoom) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 15;
            }

            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.shadowColor = 'transparent'; // reset

            // Generate Data URL for download
            const quality = 1.0 - compressionLevel;
            const dataUrl = canvas.toDataURL('image/webp', quality);
            setDownloadUrl(dataUrl);
            if (onDownloadReady) {
                onDownloadReady(dataUrl);
            }
        };
        img.src = imageSrc;

    }, [imageSrc, width, height, bgColor, blurBg, scaleZoom, stretchToFill, compressionLevel]);

    const handleDownloadClick = () => {
        setJustDownloaded(true);
        setTimeout(() => setJustDownloaded(false), 2000);
    };

    if (!imageSrc) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center text-slate-500 flex-col gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                    <span className="text-2xl opacity-50 block animate-bounce">🌍</span>
                </div>
                <p className="font-medium text-slate-400">Awaiting visual input...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-between h-full gap-8">
            <div className="relative w-full flex-grow flex items-center justify-center px-4 py-8">
                {/* Glow behind canvas */}
                <div className="absolute inset-x-10 bottom-10 h-10 bg-black blur-3xl opacity-50" />

                <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[50vh] xl:max-h-[60vh] object-contain rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/5 relative z-10"
                />
            </div>

            {downloadUrl && (
                <div className="w-full flex justify-center pb-4 relative z-20">
                    <a
                        href={downloadUrl}
                        download="picfix-export.webp"
                        onClick={handleDownloadClick}
                        className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-4 px-8 font-semibold shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-600 transition-all duration-500 group-hover:scale-110 group-hover:bg-[length:200%_auto] group-hover:animate-gradient" />

                        <div className="relative flex items-center gap-3 text-white">
                            {justDownloaded ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                    <span>Saved to disk!</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5 transform group-hover:translate-y-[2px] transition-transform duration-300" />
                                    <span>Export High-Res</span>
                                </>
                            )}
                        </div>
                    </a>
                </div>
            )}
        </div>
    );
}
