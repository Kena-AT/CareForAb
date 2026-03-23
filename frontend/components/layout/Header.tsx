import { Bell, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  showProfile?: boolean;
}

export const Header = ({ title, subtitle, onNotificationsClick, onSettingsClick }: HeaderProps) => {
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
        
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNotificationsClick}
            className="w-10 h-10 rounded-xl hover:bg-slate-50 relative group"
          >
            <Bell className="h-[18px] w-[18px] text-slate-500 group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSettingsClick}
            className="w-10 h-10 rounded-xl hover:bg-slate-50 group"
          >
            <Settings className="h-[18px] w-[18px] text-slate-500 group-hover:text-primary transition-colors" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 ml-1">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};
