"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'reminder';
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'is_read' | 'created_at'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      // Cast to any to bypass missing type definition for 'notifications' table
      const { data, error } = await (supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) as any);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('[NotificationContext] Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    
    if (!user) return;
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as AppNotification, ...prev]);
        toast.info(payload.new.title);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'is_read' | 'created_at'>) => {
    if (!user) return;
    try {
      const { error } = await (supabase
        .from('notifications' as any)
        .insert({
          user_id: user.id,
          ...notif,
          is_read: false
        } as any) as any);

      if (error) throw error;
    } catch (error) {
      console.error('[NotificationContext] Error adding notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('notifications' as any)
        .update({ is_read: true } as any)
        .eq('id', id) as any);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('[NotificationContext] Error marking as read:', error);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      const { error } = await (supabase
        .from('notifications' as any)
        .delete()
        .eq('user_id', user.id) as any);

      if (error) throw error;
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('[NotificationContext] Error clearing notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      clearAll,
      isLoading
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
