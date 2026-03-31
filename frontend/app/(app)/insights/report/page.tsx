"use client";

import dynamic from 'next/dynamic';

const ClinicalReportDetails = dynamic(
  () => import('@/components/health/ClinicalReportDetails').then(mod => mod.ClinicalReportDetails),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent animate-spin rounded-full mx-auto" />
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Loading Clinical Interface...</p>
        </div>
      </div>
    )
  }
);

export default function DoctorReportPage() {
  return <ClinicalReportDetails />;
}
