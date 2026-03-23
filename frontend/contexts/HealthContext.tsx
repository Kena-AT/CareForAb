"use client";
import React, { createContext, useContext } from 'react';
import { useHealthData } from '@/hooks/useHealthData';

type HealthContextType = ReturnType<typeof useHealthData>;

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const healthData = useHealthData();
  return (
    <HealthContext.Provider value={healthData}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
