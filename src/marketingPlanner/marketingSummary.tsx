import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectPrograms, selectFilters } from "../redux/slices/marketingSlice";
import { BRANDS, PROGRAMS } from "./marketingPlayData/marketingData";
import MarketingFilters from "./marketingComponents/marketingFilters";
import MarketingToolbox from "./marketingComponents/marketingToolbox";
import { DynamicTable, Column } from "../reusableComponents/dynamicTable";
import { Box, Typography } from "@mui/material";
import { exportMarketingToCSV } from "./marketingPlayData/exportUtil";

// Display row type for summary table
interface DisplayRow {
  id: string | number;
  brand: string;
  isBrandRow: boolean;
  program?: string;
  total_ty: number;
  months: { [key: string]: number };
  children?: DisplayRow[];
}

const MarketingSummary: React.FC = () => {
  const programs = useSelector(selectPrograms);
  const filters = useSelector(selectFilters);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Group programs by brand for expandable rows
  const displayData = useMemo(() => {
    const brandMap = new Map<string, DisplayRow>();
    programs.forEach((program) => {
      const brandName = BRANDS.find((b) => b.id === program.brand)?.name || "";
      if (!brandMap.has(brandName)) {
        brandMap.set(brandName, {
          id: `brand-${program.brand}`,
          brand: brandName,
          isBrandRow: true,
          total_ty: 0,
          months: {},
          children: [],
        });
      }
      const brandRow = brandMap.get(brandName)!;
      brandRow.children!.push({
        id: program.id,
        brand: brandName,
        isBrandRow: false,
        program: program.program.toString(),
        total_ty: program.total_ty,
        months: program.months,
      });
      brandRow.total_ty += program.total_ty;
      Object.keys(program.months).forEach((month) => {
        brandRow.months[month] =
          (brandRow.months[month] || 0) + program.months[month];
      });
    });
    return Array.from(brandMap.values());
  }, [programs]);

  const handleExpandClick = (rowId: string) => {
    setExpandedRowIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const columns: Column[] = [
    {
      key: "brand",
      header: "BRAND",
      render: (_: any, row: DisplayRow) => row.brand,
    },
    {
      key: "total_ty",
      header: "TOTAL TY",
      align: "right",
      render: (_: any, row: DisplayRow) => `$${row.total_ty.toLocaleString()}`,
    },
    ...[
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ].map((month) => ({
      key: `months.${month}`,
      header: month.toUpperCase(),
      align: "right" as const,
      render: (_: any, row: DisplayRow) =>
        `$${(row.months[month] || 0).toLocaleString()}`,
    })),
  ];

  return (
    <Box sx={{ p: 2 }}>
      <MarketingFilters
        selectedMarkets={filters.markets}
        selectedBrands={filters.brands}
        onMarketChange={() => {}}
        onBrandChange={() => {}}
      />
      <Box sx={{ mb: 1 }}>
        <MarketingToolbox
          onExport={() =>
            exportMarketingToCSV(
              displayData
                .filter(
                  (row) =>
                    !row.isBrandRow &&
                    typeof (row as any).market === "number" &&
                    typeof row.brand === "string" &&
                    typeof (row as any).program === "string" &&
                    typeof row.total_ty === "number" &&
                    typeof row.months === "object"
                )
                .map((row) => ({
                  id: Number(row.id),
                  market: Number((row as any).market),
                  brand: BRANDS.find((b) => b.name === row.brand)?.id || 0,
                  program:
                    PROGRAMS.find(
                      (p) => p.program_name === (row as any).program
                    )?.id || 0,
                  total_ty: row.total_ty,
                  months: row.months,
                  notes: (row as any).notes || "",
                }))
            )
          }
        />
      </Box>
      <DynamicTable
        data={displayData}
        columns={columns}
        showPagination={false}
        stickyHeader={true}
        maxHeight="70vh"
        getRowId={(row) => String(row.id)}
        rowTooltipContent={(row: DisplayRow) =>
          row.isBrandRow ? "Click to expand" : "Program details"
        }
        enableRowTooltip={true}
        onRowClick={(row: DisplayRow) => handleExpandClick(String(row.id))}
        expandedRowIds={expandedRowIds}
        renderExpandedRow={(row: DisplayRow) => (
          <Box sx={{ p: 2 }}>
            {row.children?.map((child: DisplayRow) => (
              <Box key={child.id} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{child.program}</Typography>
                <Typography variant="body2">
                  Total TY: ${child.total_ty.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      />
    </Box>
  );
};

export default MarketingSummary;
