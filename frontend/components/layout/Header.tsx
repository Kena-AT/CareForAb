import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const Header = ({ title, subtitle, onNotificationsClick, onSettingsClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-6 pb-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onNotificationsClick}>
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
