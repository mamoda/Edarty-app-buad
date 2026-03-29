import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// دالة لتصدير البيانات إلى Excel
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  // تحويل البيانات إلى ورقة عمل
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // إنشاء مصنف وإضافة الورقة إليه
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // ضبط عرض الأعمدة تلقائياً
  const maxWidth = 50;
  // Fix: Add type annotation for wscols
  const wscols: XLSX.ColInfo[] = [];
  
  if (data.length > 0) {
    const firstRow = data[0];
    Object.keys(firstRow).forEach(key => {
      wscols.push({ wch: Math.min(maxWidth, key.length + 10) });
    });
  }
  worksheet['!cols'] = wscols;
  
  // تصدير الملف
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${fileName}_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
};

// دالة لتصدير تقارير متعددة في ملف واحد
export const exportMultipleSheets = (sheets: { data: any[], sheetName: string }[], fileName: string) => {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(({ data, sheetName }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // ضبط عرض الأعمدة
    if (data.length > 0) {
      const firstRow = data[0];
      // Fix: Use explicit typing here as well
      const wscols: XLSX.ColInfo[] = Object.keys(firstRow).map(key => ({ wch: Math.min(50, key.length + 10) }));
      worksheet['!cols'] = wscols;
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${fileName}_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
};