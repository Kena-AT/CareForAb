import { BloodSugarReading, BloodPressureReading, Medication, MedicationSchedule, getGlucoseStatus, getBPStatus } from '@/types/health';

interface ExportData {
  bloodSugarReadings: BloodSugarReading[];
  bloodPressureReadings: BloodPressureReading[];
  medications: Medication[];
  medicationSchedules?: MedicationSchedule[];
  userName: string;
  dateRange?: { start: Date; end: Date };
}

export const exportToCSV = (data: ExportData): void => {
  const lines: string[] = [];
  
  // Header
  lines.push(`Health Report for ${data.userName}`);
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push('');
  
  // Blood Sugar Section
  lines.push('BLOOD SUGAR READINGS');
  lines.push('Date,Time,Value (mg/dL),Context,Status');
  data.bloodSugarReadings.forEach(reading => {
    const date = new Date(reading.recorded_at);
    const status = getGlucoseStatus(reading.value, reading.unit);
    lines.push(`${date.toLocaleDateString()},${date.toLocaleTimeString()},${reading.value},${reading.meal_type},${status}`);
  });
  lines.push('');
  
  // Blood Pressure Section
  lines.push('BLOOD PRESSURE READINGS');
  lines.push('Date,Time,Systolic,Diastolic,Pulse,Status');
  data.bloodPressureReadings.forEach(reading => {
    const date = new Date(reading.recorded_at);
    const status = getBPStatus(reading.systolic, reading.diastolic);
    lines.push(`${date.toLocaleDateString()},${date.toLocaleTimeString()},${reading.systolic},${reading.diastolic},${reading.pulse || 'N/A'},${status}`);
  });
  lines.push('');
  
  // Medications Section
  lines.push('MEDICATIONS');
  lines.push('Name,Dosage,Form Type,Notes');
  data.medications.forEach(med => {
    lines.push(`${med.name},${med.dosage},${med.form_type || 'N/A'},${med.notes || 'N/A'}`);
  });
  
  const csvContent = lines.join('\n');
  downloadFile(csvContent, `health-report-${Date.now()}.csv`, 'text/csv');
};

export const exportToPDF = async (data: ExportData): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text('Health Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Patient: ${data.userName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Summary Statistics
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text('Summary', 14, yPos);
  yPos += 8;
  
  const avgBloodSugar = data.bloodSugarReadings.length > 0
    ? Math.round(data.bloodSugarReadings.reduce((sum, r) => sum + r.value, 0) / data.bloodSugarReadings.length)
    : 0;
  
  const avgSystolic = data.bloodPressureReadings.length > 0
    ? Math.round(data.bloodPressureReadings.reduce((sum, r) => sum + r.systolic, 0) / data.bloodPressureReadings.length)
    : 0;
  
  const avgDiastolic = data.bloodPressureReadings.length > 0
    ? Math.round(data.bloodPressureReadings.reduce((sum, r) => sum + r.diastolic, 0) / data.bloodPressureReadings.length)
    : 0;
  
  doc.setFontSize(10);
  doc.text(`Average Blood Sugar: ${avgBloodSugar} mg/dL`, 14, yPos);
  yPos += 6;
  doc.text(`Average Blood Pressure: ${avgSystolic}/${avgDiastolic} mmHg`, 14, yPos);
  yPos += 6;
  doc.text(`Total Medications: ${data.medications.length}`, 14, yPos);
  yPos += 15;
  
  // Blood Sugar Table
  if (data.bloodSugarReadings.length > 0) {
    doc.setFontSize(14);
    doc.text('Blood Sugar Readings', 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Value (mg/dL)', 'Context', 'Status']],
      body: data.bloodSugarReadings.slice(0, 20).map(reading => {
        const date = new Date(reading.recorded_at);
        const status = getGlucoseStatus(reading.value, reading.unit);
        return [
          date.toLocaleDateString(),
          reading.value.toString(),
          reading.meal_type.replace('_', ' '),
          status.charAt(0).toUpperCase() + status.slice(1)
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Blood Pressure Table
  if (data.bloodPressureReadings.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Blood Pressure Readings', 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Systolic', 'Diastolic', 'Pulse', 'Status']],
      body: data.bloodPressureReadings.slice(0, 20).map(reading => {
        const date = new Date(reading.recorded_at);
        const status = getBPStatus(reading.systolic, reading.diastolic);
        return [
          date.toLocaleDateString(),
          reading.systolic.toString(),
          reading.diastolic.toString(),
          reading.pulse?.toString() || 'N/A',
          status.charAt(0).toUpperCase() + status.slice(1)
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Medications Table
  if (data.medications.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Current Medications', 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Medication', 'Dosage', 'Form Type', 'Notes']],
      body: data.medications.map(med => [
        med.name,
        med.dosage,
        med.form_type || 'N/A',
        med.notes || 'N/A'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated by CareforAb | Confidential Medical Information`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`health-report-${Date.now()}.pdf`);
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
