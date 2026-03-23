"use client";

import { Home, ClipboardList, Activity, User, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Medications", href: "/medications" },
  { icon: Activity, label: "Readings", href: "/readings" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card h-screen flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary">CareforAb</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              pathname === item.href 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-accent text-muted-foreground">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
