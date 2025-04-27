import { Box, Typography, CircularProgress } from "@mui/material";
import { useState, useMemo } from "react";
import { DynamicTable } from "../../../reusableComponents/dynamicTable";
import { AccountDetails } from "./accountDetails";

interface DepletionDetailsProps {
  market: string;
  value: number;
  month: any;
  year: number;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  onRetailerClick: (vipId: string, premiseType: string, name: string) => void;
  accountLevelSalesData: any[];
  isLoading: boolean;
}

interface AccountLevelSalesData {
  outlet_name: string;
  city: string;
  state: string;
  vip_cot_premise_type_desc: string;
  category: string;
  case_equivalent_quantity: number | string;
  sales_dollars: number | string;
  outlet_id: string;
  address_line_1: string;
}

export const DepletionDetails = ({
  market,
  variant_size_pack_desc,
  accountLevelSalesData,
  isLoading,
  month,
  year,
}: DepletionDetailsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [accountDetailsCache, setAccountDetailsCache] = useState<
    Record<string, any>
  >({});

  // Add IDs to the data
  const dataWithIds = useMemo(
    () =>
      accountLevelSalesData.map((row: AccountLevelSalesData) => ({
        ...row,
        // Create a unique ID using outlet_name and location if needed
        id: `${row.outlet_name}-${row.city}-${row.state}-${row.outlet_id}`, // Made slightly more unique
      })),
    [accountLevelSalesData]
  );

  const handleRowClick = (row: any) => {
    setSelectedOutletId(row.outlet_id);
  };

  const handleCloseAccountDetails = () => {
    setSelectedOutletId(null);
  };

  // Define columns, marking 'Account' as filterable
  const columns = useMemo(
    () => [
      {
        header: "Account",
        key: "outlet_name",
        width: 250,
        render: (value: string) => value,
        filterable: true,
        getValue: (row: AccountLevelSalesData) => row.outlet_name,
      },
      {
        header: "Address",
        key: "address_line_1",
        width: 200,
        render: (value: string) => value,
        filterable: true,
        getValue: (row: AccountLevelSalesData) => row.address_line_1,
      },
      {
        header: "City/State",
        key: "city",
        width: 150,
        render: (_: any, row: AccountLevelSalesData) =>
          `${row.city}, ${row.state}`,
        getValue: (row: AccountLevelSalesData) => `${row.city}, ${row.state}`,
        filterable: true,
      },
      {
        header: "Type",
        key: "vip_cot_premise_type_desc",
        width: 120,
        align: "center" as const,
        render: (value: string) => value,
        filterable: true,
        getValue: (row: AccountLevelSalesData) => row.vip_cot_premise_type_desc,
      },
      {
        header: "Qty (9L)",
        key: "case_equivalent_quantity",
        width: 100,
        align: "right" as const,
        render: (value: number | string) =>
          typeof value === "number"
            ? value.toFixed(1)
            : parseFloat(String(value)).toFixed(1),
        sortAccessor: (row: AccountLevelSalesData) =>
          typeof row.case_equivalent_quantity === "string"
            ? parseFloat(row.case_equivalent_quantity)
            : row.case_equivalent_quantity,
      },
      {
        header: "Sales",
        key: "sales_dollars",
        width: 120,
        align: "right" as const,
        render: (value: number | string) => {
          const numValue =
            typeof value === "string" ? parseFloat(value) : value;
          return `$${numValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
        sortAccessor: (row: AccountLevelSalesData) =>
          typeof row.sales_dollars === "string"
            ? parseFloat(row.sales_dollars)
            : row.sales_dollars,
      },
    ],
    []
  );

  return (
    <Box>
      {selectedOutletId ? (
        <AccountDetails
          outletId={selectedOutletId}
          onClose={handleCloseAccountDetails}
          cachedData={accountDetailsCache[selectedOutletId]}
          onDataFetched={(data) => {
            setAccountDetailsCache((prev) => ({
              ...prev,
              [selectedOutletId]: data,
            }));
          }}
        />
      ) : (
        <>
          <Box sx={{ mb: 3, px: 3 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                color: (theme) => theme.palette.primary.main,
              }}
            >
              DEPLETION DETAILS
            </Typography>
            <Typography variant="subtitle1">
              <strong>Size Pack:</strong> {variant_size_pack_desc}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Market:</strong> {market}
            </Typography>
            <Typography variant="subtitle1">
              <strong>Month:</strong>{" "}
              {new Date(0, month - 1).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </Typography>
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !accountLevelSalesData || accountLevelSalesData.length === 0 ? (
            <Typography variant="h6" sx={{ textAlign: "center", py: 4 }}>
              No RAD data available
            </Typography>
          ) : (
            <>
              <DynamicTable
                data={dataWithIds} // Pass potentially ID-added data
                columns={columns}
                enableColumnFiltering={true} // <-- Enable the feature
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0); // Reset page on rows per page change too
                }}
                getRowId={(row) => row.id} // Use the generated ID
                onRowClick={handleRowClick}
                stickyHeader // Keep sticky header if needed
                maxHeight="60vh" // Adjust max height if needed
              />
            </>
          )}
        </>
      )}
    </Box>
  );
};
