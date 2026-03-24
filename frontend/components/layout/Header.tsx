"use client";

import { useState } from 'react';
import { Bell, Settings, User, Trash2, CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSettingsClick?: () => void;
  rightElement?: React.ReactNode;
}

export const Header = ({ title, subtitle, onSettingsClick, rightElement }: HeaderProps) => {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'reminder': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-0.5"
        >
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{subtitle}</p>
          )}
        </motion.div>
        
        <div className="flex items-center gap-2">
          {rightElement}
          {/* Notifications Bell */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-10 h-10 rounded-xl hover:bg-slate-50 relative group"
              >
                <Bell className="h-[18px] w-[18px] text-slate-500 group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border-slate-100 shadow-2xl rounded-2xl overflow-hidden" align="end">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                {notifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAll}
                    className="h-8 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[350px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">No notifications yet</p>
                    <p className="text-xs text-slate-400">Any health alerts or reminders will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "p-4 transition-colors cursor-pointer group hover:bg-slate-50/80",
                          !notif.is_read && "bg-slate-50/40"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {getIcon(notif.type)}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className={cn(
                                "text-xs font-bold leading-none",
                                notif.is_read ? "text-slate-600" : "text-slate-900"
                              )}>
                                {notif.title}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-500">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>


          {/* Fixed Profile Button */}
          <Link href="/profile">
            <Button 
              variant="ghost" 
              className="h-10 px-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 transition-colors group-hover:bg-teal-100">
                <User size={16} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500 leading-none">Profile</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
