"use client";

import React, { createContext, useContext, ReactNode } from 'react';

interface HealthContextType {
  // Add health-related state here as needed
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const value: HealthContextType = {};
  
  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}
