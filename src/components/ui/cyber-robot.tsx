import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight animated cyber-robot — pure SVG/CSS, no external deps, no WebGL.
 * Works instantly on mobile and desktop. The head subtly follows the cursor
 * (and gently idles on touch devices).
 */
export function CyberRobot({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      setTilt({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Ambient glows */}
      <div className="absolute w-2/3 h-2/3 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute bottom-6 w-1/2 h-10 rounded-[100%] bg-cyan-500/20 blur-2xl" />

      {/* Cyber grid floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.6) 1px,transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          transform: 'perspective(300px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }}
      />

      {/* Robot — floats up/down; head group reacts to cursor */}
      <svg
        viewBox="0 0 220 260"
        className="relative w-[62%] max-w-[260px] animate-float drop-shadow-[0_0_25px_rgba(34,211,238,0.25)]"
        fill="none"
        style={{ transform: `translate(${tilt.x * 8}px, ${tilt.y * 6}px)`, transition: 'transform 120ms ease-out' }}
        aria-hidden
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2a3a" />
            <stop offset="1" stopColor="#0b121c" />
          </linearGradient>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a3b4d" />
            <stop offset="1" stopColor="#16212e" />
          </linearGradient>
          <radialGradient id="eyeGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#a5f3fc" />
            <stop offset="0.6" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#0891b2" />
          </radialGradient>
        </defs>

        {/* Antenna */}
        <line x1="110" y1="40" x2="110" y2="18" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
        <circle cx="110" cy="14" r="6" fill="#22d3ee" className="animate-pulse-glow" />

        {/* Neck */}
        <rect x="98" y="92" width="24" height="18" rx="5" fill="url(#metalGrad)" stroke="#22d3ee" strokeOpacity="0.3" />

        {/* Body */}
        <rect x="58" y="104" width="104" height="96" rx="22" fill="url(#bodyGrad)" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="2" />
        {/* Chest core */}
        <circle cx="110" cy="150" r="16" fill="#0b121c" stroke="#22d3ee" strokeOpacity="0.5" />
        <circle cx="110" cy="150" r="8" fill="url(#eyeGrad)" className="animate-pulse-glow" />
        {/* Chest vents */}
        <rect x="74" y="176" width="72" height="4" rx="2" fill="#22d3ee" fillOpacity="0.25" />
        <rect x="80" y="186" width="60" height="4" rx="2" fill="#22d3ee" fillOpacity="0.18" />

        {/* Arms */}
        <rect x="36" y="112" width="18" height="64" rx="9" fill="url(#metalGrad)" stroke="#22d3ee" strokeOpacity="0.25" />
        <rect x="166" y="112" width="18" height="64" rx="9" fill="url(#metalGrad)" stroke="#22d3ee" strokeOpacity="0.25" />

        {/* Head */}
        <g style={{ transform: `translate(${tilt.x * 6}px, ${tilt.y * 4}px)`, transition: 'transform 120ms ease-out' }}>
          <rect x="66" y="40" width="88" height="60" rx="20" fill="url(#metalGrad)" stroke="#22d3ee" strokeOpacity="0.5" strokeWidth="2" />
          {/* Visor */}
          <rect x="76" y="54" width="68" height="30" rx="14" fill="#06141f" stroke="#22d3ee" strokeOpacity="0.4" />
          {/* Eyes */}
          <circle cx="96" cy="69" r="7" fill="url(#eyeGrad)" className="animate-pulse-glow" />
          <circle cx="124" cy="69" r="7" fill="url(#eyeGrad)" className="animate-pulse-glow" />
          {/* Side ears */}
          <rect x="60" y="60" width="6" height="18" rx="3" fill="#22d3ee" fillOpacity="0.5" />
          <rect x="154" y="60" width="6" height="18" rx="3" fill="#22d3ee" fillOpacity="0.5" />
        </g>
      </svg>

      {/* Scan line sweeping across */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-scan-line" />
      </div>
    </div>
  );
}
