import ExcelJS from 'exceljs';
import { ExportFieldConfig } from './FinanceExportConfigDialog';

interface ScanRow {
  id: string;
  clusterId: string;
  rowType: 'week';
  market: string;
  account: string;
  product: string;
  week: string;
  scanAmount: number;
  totalScan: number;
  projectedScan: number;
  projectedRetail: number;
  qd: number;
  retailerMargin: number;
  loyalty: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'review';
  comments?: string;
}

interface Market {
  name: string;
  abbr: string;
}

// Field mapping from config to data properties
const FIELD_MAPPING = {
  bottleCost: 'projectedRetail', // Using projectedRetail as bottle cost equivalent
  frontlineSRP: 'projectedRetail',
  frontlineMargin: 'retailerMargin',
  scan: 'scanAmount',
  promoSRP: 'projectedScan', // Using projectedScan as promo SRP equivalent
  promoMargin: 'retailerMargin', // Using same margin for promo
  loyaltyPerBottle: 'loyalty',
  loyaltyOffer: 'comments', // Using comments as loyalty offer
  comment: 'comments',
};

const FIELD_LABELS = {
  bottleCost: 'BOTTLE COST',
  frontlineSRP: 'FRONTLINE SRP',
  frontlineMargin: 'FRONTLINE MARGIN %',
  scan: 'SCAN',
  promoSRP: 'PROMO SRP',
  promoMargin: 'PROMO MARGIN %',
  loyaltyPerBottle: 'LOYALTY PER BOTTLE',
  loyaltyOffer: 'LOYALTY OFFER',
  comment: 'COMMENT',
};

const FIELD_COLORS = {
  bottleCost: 'FFF0F0F0',
  frontlineSRP: 'FFF0F0F0',
  frontlineMargin: 'FFF0F0F0',
  scan: 'FF87CEEB',
  promoSRP: 'FF87CEEB',
  promoMargin: 'FF87CEEB',
  loyaltyPerBottle: 'FFDA70D6',
  loyaltyOffer: 'FFDA70D6',
  comment: 'FFDA70D6',
};

const FIELD_TYPES = {
  bottleCost: 'currency',
  frontlineSRP: 'currency',
  frontlineMargin: 'percent',
  scan: 'currency',
  promoSRP: 'currency',
  promoMargin: 'percent',
  loyaltyPerBottle: 'currency',
  loyaltyOffer: 'text',
  comment: 'text',
};

export async function exportFinanceExcel(
  rows: ScanRow[],
  config: ExportFieldConfig,
  fileName: string,
  markets: Market[],
  retailers: string[],
  selectedMarkets: string[],
  selectedRetailers: string[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Month columns: JAN-DEC
  const monthNames = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  // Get selected fields
  const selectedFields = Object.entries(config)
    .filter(([_, selected]) => selected)
    .map(([field]) => field as keyof ExportFieldConfig);

  // Filter rows based on selected markets and retailers
  let filteredRows = rows;

  if (selectedMarkets.length > 0) {
    filteredRows = filteredRows.filter((row) =>
      selectedMarkets.includes(row.market),
    );
  }

  if (selectedRetailers.length > 0) {
    filteredRows = filteredRows.filter((row) =>
      selectedRetailers.includes(row.account),
    );
  }

  // Group data by market
  const marketGroups = filteredRows.reduce((acc, row) => {
    if (!acc[row.market]) {
      acc[row.market] = [];
    }
    acc[row.market].push(row);
    return acc;
  }, {} as Record<string, ScanRow[]>);

  // Create a sheet for each market
  for (const [marketName, marketRows] of Object.entries(marketGroups)) {
    const ws = workbook.addWorksheet(`${marketName} Market`);

    // Get unique retailers for this market
    const marketRetailers = Array.from(
      new Set(marketRows.map((row) => row.account)),
    );
    const retailerText =
      marketRetailers.length === 1
        ? marketRetailers[0]
        : `${marketRetailers.length} Retailers`;

    // Title row
    const titleRow = ws.addRow([
      `${marketName} Market - ${retailerText} - ${new Date().toLocaleDateString(
        'en-US',
        {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        },
      )}`,
    ]);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(1, 1, 1, 1 + monthNames.length);

    // Add blank row
    ws.addRow([]);

    // Group by product
    const productGroups = marketRows.reduce((acc, row) => {
      if (!acc[row.product]) {
        acc[row.product] = [];
      }
      acc[row.product].push(row);
      return acc;
    }, {} as Record<string, ScanRow[]>);

    let currentRow = 3;

    // Create product tables
    for (const [productName, productRows] of Object.entries(productGroups)) {
      // Add spacing between products (except first)
      if (currentRow > 3) {
        ws.addRow([]);
        currentRow++;
      }

      // Product header row
      const productHeaderRow = ws.addRow([
        productName.toUpperCase(),
        ...monthNames,
      ]);
      productHeaderRow.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      productHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF333333' },
      };
      productHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add borders to header
      for (let i = 1; i <= 1 + monthNames.length; i++) {
        productHeaderRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      }
      currentRow++;

      // Map product data by month
      const monthMap: Record<string, ScanRow | undefined> = {};
      for (const row of productRows) {
        // Parse the week string to get the month
        const weekDate = new Date(row.week);
        const monthIndex = weekDate.getMonth();
        const monthName = monthNames[monthIndex];
        monthMap[monthName] = row;
      }

      // Create data rows for selected fields
      for (const fieldKey of selectedFields) {
        const rowValues = [FIELD_LABELS[fieldKey]];

        for (const monthName of monthNames) {
          const data = monthMap[monthName];
          if (!data) {
            rowValues.push('');
          } else {
            const dataField = FIELD_MAPPING[fieldKey];
            const fieldValue = (data as any)[dataField];

            if (FIELD_TYPES[fieldKey] === 'currency') {
              rowValues.push(
                typeof fieldValue === 'number' && fieldValue !== 0
                  ? fieldValue.toString()
                  : '',
              );
            } else if (FIELD_TYPES[fieldKey] === 'percent') {
              rowValues.push(
                typeof fieldValue === 'number' && fieldValue !== 0
                  ? (fieldValue / 100).toString()
                  : '',
              );
            } else {
              rowValues.push(
                fieldValue !== undefined && fieldValue !== '' ? fieldValue : '',
              );
            }
          }
        }

        const dataRow = ws.addRow(rowValues);

        // Style the label column
        dataRow.getCell(1).font = {
          bold: true,
          size: 10,
          color: { argb: 'FF000000' },
        };
        dataRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: FIELD_COLORS[fieldKey] },
        };
        dataRow.getCell(1).alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };

        // Style the data columns
        for (let i = 2; i <= 1 + monthNames.length; i++) {
          const cell = dataRow.getCell(i);
          cell.font = { size: 10, color: { argb: 'FF000000' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          };
          cell.alignment = {
            horizontal: FIELD_TYPES[fieldKey] === 'text' ? 'left' : 'right',
            vertical: 'middle',
          };

          // Add borders
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };

          // Format numbers
          if (
            FIELD_TYPES[fieldKey] === 'currency' &&
            cell.value &&
            cell.value !== ''
          ) {
            cell.numFmt = '"$"#,##0.00';
          } else if (
            FIELD_TYPES[fieldKey] === 'percent' &&
            cell.value &&
            cell.value !== ''
          ) {
            cell.numFmt = '0.0%';
          }
        }

        // Add border to label column
        dataRow.getCell(1).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };

        currentRow++;
      }
    }

    // Set column widths
    ws.getColumn(1).width = 20;
    for (let i = 2; i <= 1 + monthNames.length; i++) {
      ws.getColumn(i).width = 11;
    }

    // Set row heights
    for (let i = 1; i <= ws.rowCount; i++) {
      ws.getRow(i).height = 18;
    }
  }

  // Download the file
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}
