"use client";

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Zap, Brain, X } from 'lucide-react';

const CareforAbAILogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    className={className}
  >
    <defs>
      <linearGradient id="careforabAiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2dd4bf" /> {/* Emerald 400 */}
        <stop offset="100%" stopColor="#0284c7" /> {/* Teal 600 */}
      </linearGradient>
      <linearGradient id="careforabAiInner" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f0fdfa" />
      </linearGradient>
    </defs>
    
    {/* Stylized outer shield/hex */}
    <path 
      d="M24 2 L42 12 V32 L24 46 L6 32 V12 Z" 
      fill="url(#careforabAiGrad)" 
      stroke="white"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    
    {/* Tech/AI nodes in corners */}
    <circle cx="24" cy="8" r="2" fill="white" />
    <circle cx="12" cy="16" r="2" fill="white" />
    <circle cx="36" cy="16" r="2" fill="white" />
    
    {/* Inner cross representing care/health mixed with a spark/star (AI) */}
    <path 
      d="M24 16 L26 22 L32 24 L26 26 L24 32 L22 26 L16 24 L22 22 Z" 
      fill="url(#careforabAiInner)" 
    />
    
    {/* Center node */}
    <circle cx="24" cy="24" r="2.5" fill="#0284c7" />
  </svg>
);

export const FloatingAIButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleRunAI = () => {
    setOpen(false);

    if (pathname.startsWith('/insights')) {
      window.dispatchEvent(new Event('careforab:run-ai-audit'));
      return;
    }

    router.push('/insights?autorun=1');
  };

  const handleOpenInsights = () => {
    setOpen(false);
    router.push('/insights');
  };

  return (
    <div className="fixed right-4 bottom-24 md:bottom-6 z-[130] flex flex-col items-end gap-3">
      {open && (
        <div className="w-[220px] rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-300/30 p-3 space-y-2">
          <button
            type="button"
            onClick={handleRunAI}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90"
          >
            <Zap className="w-4 h-4" />
            Run Clinical Audit
          </button>

          <button
            type="button"
            onClick={handleOpenInsights}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-100"
          >
            <Brain className="w-4 h-4" />
            Open Insights
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open AI assistant"
        className="h-16 w-16 rounded-full bg-white shadow-xl shadow-slate-300/40 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all overflow-hidden border border-slate-100"
      >
        {open ? <X className="w-8 h-8 text-slate-700" /> : <CareforAbAILogo className="w-12 h-12" />}
      </button>
    </div>
  );
};
