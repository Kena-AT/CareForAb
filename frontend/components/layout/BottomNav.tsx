"use client";
import { Home, Pill, Activity, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const BottomNav = () => {
  const pathname = usePathname();

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home, href: '/dashboard' },
    { id: 'insights', label: 'Insights', icon: Zap, href: '/insights' },
    { id: 'medications', label: 'Medications', icon: Pill, href: '/medications' },
    { id: 'readings', label: 'Readings', icon: Activity, href: '/readings' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe-bottom md:hidden">
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all duration-300",
                isActive 
                  ? "text-primary bg-[#f0fdfaff]" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider",
                isActive ? "text-primary opacity-100" : "opacity-60"
              )}>
                {tab.label === 'Medications' ? 'Meds' : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
