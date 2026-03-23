"use client";
import { BottomNav } from "@/components/layout/BottomNav";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useHealth } from "@/contexts/HealthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const LoadingSkeleton = () => (
  <div className="min-h-screen p-4 space-y-4">
    <Skeleton className="h-16 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showSettings, setShowSettings] = useState(false);
  const { isLoading } = useHealth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pb-24">
        {children}
      </main>
      <BottomNav />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
