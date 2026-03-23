"use client";

import { ReadingsScreen } from "@/components/screens/ReadingsScreen";
import { useHealth } from "@/contexts/HealthContext";

export default function ReadingsPage() {
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    addBloodSugarReading, 
    addBloodPressureReading 
  } = useHealth();

  return (
    <ReadingsScreen 
      bloodSugarReadings={bloodSugarReadings} 
      bloodPressureReadings={bloodPressureReadings} 
      onAddBloodSugar={addBloodSugarReading as any}
      onAddBloodPressure={addBloodPressureReading as any}
    />
  );
}
