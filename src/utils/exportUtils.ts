import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

type ExportFormat = 'xlsx' | 'csv';

interface ExportOptions {
  fileName: string;
  format: ExportFormat;
  sheets?: {
    name: string;
    data: any[];
  }[];
  data?: any[];
}

export const exportData = ({ fileName, format, sheets, data }: ExportOptions) => {
  try {
    const workbook = XLSX.utils.book_new();

    if (sheets) {
      // Multiple sheets
      sheets.forEach(sheet => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });
    } else if (data) {
      // Single sheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }

    if (format === 'xlsx') {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, `${fileName}.xlsx`);
    } else {
      const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
      const dataBlob = new Blob([csvBuffer], { type: 'text/csv;charset=utf-8' });
      saveAs(dataBlob, `${fileName}.csv`);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

export const formatDataForExport = (data: any[], excludeFields: string[] = []) => {
  return data.map(item => {
    const formattedItem: Record<string, any> = {};
    
    Object.entries(item).forEach(([key, value]) => {
      if (excludeFields.includes(key)) return;

      // Format dates
      if (value instanceof Date) {
        formattedItem[key] = value.toLocaleDateString();
      }
      // Format nested objects
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (excludeFields.includes(nestedKey)) return;
          formattedItem[`${key}_${nestedKey}`] = nestedValue;
        });
      }
      // Format arrays
      else if (Array.isArray(value)) {
        formattedItem[key] = value.join(', ');
      }
      // Format other values
      else {
        formattedItem[key] = value;
      }
    });

    return formattedItem;
  });
};
