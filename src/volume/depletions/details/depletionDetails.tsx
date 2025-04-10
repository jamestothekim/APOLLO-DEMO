import { DialogTitle, Box, Typography, CircularProgress } from "@mui/material";
import { useState } from "react";
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
  const dataWithIds = accountLevelSalesData.map(
    (row: AccountLevelSalesData) => ({
      ...row,
      // Create a unique ID using outlet_name and location
      id: `${row.outlet_name}-${row.city}-${row.state}`,
    })
  );

  const handleRowClick = (row: any) => {
    setSelectedOutletId(row.outlet_id);
  };

  const handleCloseAccountDetails = () => {
    setSelectedOutletId(null);
  };

  const columns = [
    {
      header: "Account",
      key: "outlet_name",
      render: (value: string) => value,
    },
    {
      header: "Address",
      key: "address_line_1",
      render: (value: string) => value,
    },
    {
      header: "City/State",
      key: "city",
      render: (_: any, row: AccountLevelSalesData) =>
        `${row.city}, ${row.state}`,
    },
    {
      header: "Premise Type",
      key: "vip_cot_premise_type_desc",
      render: (value: string) => value,
    },
    {
      header: "Qty (9L)",
      key: "case_equivalent_quantity",
      render: (value: number) =>
        typeof value === "number"
          ? value.toFixed(1)
          : parseFloat(value).toFixed(1),
    },
    {
      header: "Sales ($)",
      key: "sales_dollars",
      render: (value: number) =>
        typeof value === "number"
          ? value.toFixed(2)
          : parseFloat(value).toFixed(2),
    },
  ];

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
          <DialogTitle>Depletion Details</DialogTitle>
          <Box sx={{ mb: 3, px: 3 }}>
            <Typography variant="subtitle1">
              <strong>Size SKU:</strong> {variant_size_pack_desc}
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
            <DynamicTable
              data={dataWithIds}
              columns={columns}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              getRowId={(row) => row.id}
              onRowClick={handleRowClick}
            />
          )}
        </>
      )}
    </Box>
  );
};
