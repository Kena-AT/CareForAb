"use client";

import { Home, ClipboardList, Activity, User, Settings, LucideIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

const items: SidebarItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Activity, label: "Vitals", href: "/vitals" },
  { icon: ClipboardList, label: "Medications", href: "/medications" },
  { icon: Zap, label: "Insights", href: "/insights" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r border-slate-100 bg-white h-screen flex flex-col shrink-0 sticky top-0 z-50">
      {/* Brand Section */}
      <div className="p-8">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900">CareforAb</h1>
        </motion.div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 space-y-1.5 pt-2">
        <p className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Main Menu</p>
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-[20px] transition-all duration-300 group relative",
                isActive 
                  ? "bg-[#f0fdfaff] text-primary shadow-sm" 
                  : "hover:bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-primary" : "text-slate-300 group-hover:text-slate-500"
              )} />
              <span className={cn(
                "text-sm font-bold tracking-tight",
                isActive ? "text-primary" : "text-slate-500"
              )}>{item.label}</span>
              
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Bottom Section */}
      <div className="p-4 mt-auto border-t border-slate-50">
        <div className="flex items-center justify-center p-2">
           <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">CareforAb v1.0</p>
        </div>
      </div>
    </div>
  );
}
