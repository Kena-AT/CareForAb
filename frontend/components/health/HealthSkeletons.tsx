import React from 'react';
import { Card } from '@/components/ui/card';

export const MedicationSkeleton = () => (
  <div className="p-5 flex items-center gap-4 animate-pulse">
    <div className="w-11 h-11 bg-slate-100 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className="h-4 bg-slate-100 rounded w-1/2" />
    </div>
    <div className="w-24 h-9 bg-slate-100 rounded-xl" />
  </div>
);

export const InventorySkeleton = () => (
  <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden p-5 animate-pulse">
    <div className="w-10 h-10 bg-slate-100 rounded-2xl mb-4" />
    <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
    <div className="h-8 bg-slate-100 rounded-xl w-full" />
  </Card>
);

export const VitalsSkeleton = () => (
   <Card className="lg:col-span-1 border-none bg-white shadow-sm rounded-[20px] p-6 h-full animate-pulse">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
      <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-full" />
   </Card>
);

export const MedCardSkeleton = () => (
  <div className="p-4 bg-white rounded-2xl flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
    </div>
    <div className="w-20 h-8 bg-slate-100 rounded-lg" />
  </div>
);
