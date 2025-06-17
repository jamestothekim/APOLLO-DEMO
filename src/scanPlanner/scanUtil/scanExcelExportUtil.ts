import ExcelJS from 'exceljs';
import { ScanPlannerRow } from './types';

interface ExportConfig {
  selectedFields: string[];
  fileName?: string;
}

const FIELD_LABELS: Record<string, string> = {
  market: 'Market',
  account: 'Account',
  product: 'Product',
  clusterId: 'Cluster ID',
  scanWeek: 'Scan Week',
  scanAmount: 'Scan Amount',
  scanValue: 'Scan Value',
  growthRate: 'Growth Rate',
  projectedValue: 'Projected Value',
  totalValue: 'Total Value',
  status: 'Status',
  createdBy: 'Created By',
  createdDate: 'Created Date',
};

export const exportScanPlanToExcel = async (
  data: ScanPlannerRow[],
  config: ExportConfig,
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scan Plan');

  // Add headers
  const headers = config.selectedFields.map(
    (field) => FIELD_LABELS[field] || field,
  );
  worksheet.addRow(headers);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach((row) => {
    const rowData = config.selectedFields.map((field) => {
      switch (field) {
        case 'createdDate':
          return new Date(row[field]).toLocaleDateString();
        case 'totalValue':
        case 'scanValue':
        case 'projectedValue':
          return typeof row[field] === 'number'
            ? row[field].toLocaleString()
            : row[field];
        default:
          return row[field];
      }
    });
    worksheet.addRow(rowData);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (column.number) {
      const maxLength = Math.max(
        ...worksheet
          .getColumn(column.number)
          .values.map((value) => (value ? String(value).length : 0)),
      );
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    }
  });

  // Generate the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.fileName || 'scan_plan_export.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
