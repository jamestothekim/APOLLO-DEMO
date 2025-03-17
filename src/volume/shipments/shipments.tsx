import React, { useState, useMemo } from "react";
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import { ShipmentSidebar } from "./shipmentSidebar";
import { CommentDialog } from "../components/commentDialog";
import {
  TARGET_DOI_OPTIONS,
  type ShipmentData,
  type TargetDOI,
  useForecast,
} from "../../data/data";
import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";

interface ShipmentsProps {
  selectedMarkets: string[];
  selectedItems: string[];
}

export const Shipments: React.FC<ShipmentsProps> = ({
  selectedMarkets,
  selectedItems,
}) => {
  const { shipmentData, budgetData, updateSingleShipment } = useForecast();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();

  const selectedData = shipmentData.find((row) => row.id === selectedRow);

  const calculateTotal = (months: ShipmentData["months"]) => {
    return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
  };

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const handleTargetDOIChange = (
    event: SelectChangeEvent<string>,
    rowId: string
  ) => {
    event.stopPropagation();
    const targetDOI = event.target.value as TargetDOI;
    const row = shipmentData.find((r) => r.id === rowId);
    if (!row) return;

    updateSingleShipment({
      ...row,
      targetDOI,
    });
  };

  const filteredData = shipmentData.filter((row) => {
    const marketMatch =
      selectedMarkets.length === 0 || selectedMarkets.includes(row.market);
    const itemMatch =
      selectedItems.length === 0 || selectedItems.includes(row.item);
    return marketMatch && itemMatch;
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSidebarSave = (updatedData: ShipmentData) => {
    updateSingleShipment(updatedData);
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setCommentDialogOpen(true);
  };

  const hasAnyComments = () => {
    return filteredData.some((row) => row.commentary);
  };

  const columns: Column[] = useMemo(
    () => [
      {
        key: "market",
        header: "MARKET",
        align: "left",
      },
      {
        key: "item",
        header: "ITEM",
        align: "left",
      },
      {
        key: "targetDOI",
        header: "TARGET DOI",
        align: "left",
        render: (value: TargetDOI, row: ShipmentData) => (
          <Select
            value={value}
            onChange={(e) => handleTargetDOIChange(e, row.id)}
            onClick={(e) => e.stopPropagation()}
            size="small"
            sx={{ fontSize: "inherit" }}
          >
            {TARGET_DOI_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        ),
      },
      // Dynamically generate month columns
      ...Object.keys(shipmentData[0].months).map((month) => ({
        key: `months.${month}`,
        header: month,
        subHeader: shipmentData[0].months[month].isActual ? "ACT" : "FCST",
        align: "right" as const,
        render: (_: any, row: ShipmentData) => {
          const data = row.months[month];
          return (
            <div style={{ position: "relative" }}>
              <Box
                component="span"
                sx={{
                  color: data.isActual ? "primary.main" : "inherit",
                }}
              >
                {data.value.toLocaleString()}
              </Box>
              {data.isManuallyModified && (
                <EditIcon
                  sx={{
                    fontSize: "0.875rem",
                    position: "absolute",
                    right: "-16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "secondary.main",
                  }}
                />
              )}
            </div>
          );
        },
      })),
      {
        key: "total",
        header: "TOTAL",
        align: "right",
        render: (_: any, row: ShipmentData) =>
          calculateTotal(row.months).toLocaleString(),
      },
      {
        key: "endInv",
        header: "INV",
        align: "right",
        render: (value: number) => value.toLocaleString(),
      },
      {
        key: "budget",
        header: "BUDGET",
        align: "right",
        render: (_: any, row: ShipmentData) => {
          // Extract the number from shipment ID (assuming format "shipment-X")
          const shipmentNumber = row.id.split("-")[1];
          const budgetId = `budget-${shipmentNumber}`;

          const budgetRow = budgetData.find((budget) => budget.id === budgetId);

          const budgetTotal = budgetRow
            ? Object.values(budgetRow.months).reduce((acc, curr) => {
                const value = typeof curr.value === "number" ? curr.value : 0;
                return acc + value;
              }, 0)
            : 0;

          return budgetTotal.toLocaleString();
        },
      },
      {
        key: "variance",
        header: "% vs BUD",
        align: "right",
        render: (_: any, row: ShipmentData) => {
          const shipmentNumber = row.id.split("-")[1];
          const budgetId = `budget-${shipmentNumber}`;

          const budgetRow = budgetData.find((budget) => budget.id === budgetId);
          const total = Object.values(row.months).reduce((acc, curr) => {
            const value = typeof curr.value === "number" ? curr.value : 0;
            return acc + value;
          }, 0);
          const budgetTotal = budgetRow
            ? Object.values(budgetRow.months).reduce((acc, curr) => {
                const value = typeof curr.value === "number" ? curr.value : 0;
                return acc + value;
              }, 0)
            : 0;
          const variance =
            budgetTotal === 0 ? 0 : ((total - budgetTotal) / budgetTotal) * 100;
          return (
            <Box sx={{ color: variance < 0 ? "error.main" : "success.main" }}>
              {variance.toFixed(1)}%
            </Box>
          );
        },
      },
      ...(hasAnyComments()
        ? [
            {
              key: "commentary",
              header: "COM",
              align: "center" as const,
              render: (commentary: string | undefined) =>
                commentary ? (
                  <Box
                    onClick={(e) => handleCommentClick(e, commentary)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Tooltip title="View Comment">
                      <CommentIcon color="action" fontSize="small" />
                    </Tooltip>
                  </Box>
                ) : null,
            },
          ]
        : []),
    ],
    [shipmentData, budgetData, hasAnyComments]
  );

  return (
    <Box>
      <DynamicTable
        data={filteredData}
        columns={columns}
        onRowClick={(row) => handleRowClick(row.id)}
        selectedRow={selectedRow}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />

      <ShipmentSidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        selectedData={selectedData}
        onSave={handleSidebarSave}
      />

      <CommentDialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        commentary={selectedComment}
      />
    </Box>
  );
};
