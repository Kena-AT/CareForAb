"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-media-query";
import { BottomNav } from "@/components/layout/BottomNav";
import dynamic from "next/dynamic";

const SettingsDialog = dynamic(() => import("@/components/settings/SettingsDialog").then(mod => mod.SettingsDialog), {
  ssr: false
});

const LoadingSkeleton = () => (
  <div className="flex-1 p-8 space-y-8 bg-[#f6fafaff]">
    <Skeleton className="h-16 w-full rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
    </div>
    <Skeleton className="h-64 w-full rounded-[2.5rem]" />
    <Skeleton className="h-64 w-full rounded-[2.5rem]" />
  </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showSettings, setShowSettings] = useState(false);
  const { initialized: authInitialized } = useAuth();
  const isMobile = useIsMobile();

  // Primary gate is handled by AuthProvider, this is a secondary fallback for layout stability
  if (!authInitialized) return <LoadingSkeleton />;

  return (
    <div className="flex min-h-screen bg-[#f6fafaff] text-slate-900 font-sans">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 relative">
          <Suspense fallback={<LoadingSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>

      {isMobile && <BottomNav />}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
