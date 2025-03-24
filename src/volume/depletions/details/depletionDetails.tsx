import {
  DialogTitle,
  Box,
  Typography,
  CircularProgress,
  Dialog,
} from "@mui/material";
import { useState } from "react";
import { DynamicTable } from "../../../reusableComponents/dynamicTable";
import { AccountDetails } from "./accountDetails";

interface DepletionDetailsProps {
  market: string;
  item: string;
  value: number;
  month: any;
  year: number;
  variant_size_pack: string;
  onRetailerClick: (vipId: string, premiseType: string, name: string) => void;
  accountLevelSalesData: any[];
  isLoading: boolean;
}

interface AccountLevelSalesData {
  account_type: string;
  outlet_name: string;
  city: string;
  state: string;
  premise_type: string;
  quantity: number;
  sales_dollars: number;
}

export const DepletionDetails = ({
  market,
  item,
  accountLevelSalesData,
  isLoading,
}: DepletionDetailsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false);
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
    console.log("Selected outlet:", row);
    setSelectedOutletId(row.outlet_id);
    setAccountDetailsOpen(true);
  };

  const handleClose = () => {
    setAccountDetailsOpen(false);
  };

  const columns = [
    {
      header: "Account",
      key: "outlet_name",
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
      key: "premise_type",
      render: (value: string) => value,
    },
    {
      header: "Category",
      key: "account_type",
      render: (value: string) => value,
    },
    {
      header: "Qty (9L)",
      key: "case_equivalent_quantity",
      render: (value: number) => value.toString(),
    },
    {
      header: "Sales ($)",
      key: "sales_dollars",
      render: (value: number) => value.toString(),
    },
  ];

  return (
    <>
      <DialogTitle>Depletion Details</DialogTitle>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">
          <strong>Size SKU:</strong> {item}
        </Typography>
        <Typography variant="subtitle1">
          <strong>Market:</strong> {market}
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

      <Dialog
        open={accountDetailsOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
      >
        {selectedOutletId && (
          <AccountDetails
            outletId={selectedOutletId}
            onClose={handleClose}
            cachedData={accountDetailsCache[selectedOutletId]}
            onDataFetched={(data) => {
              setAccountDetailsCache((prev) => ({
                ...prev,
                [selectedOutletId]: data,
              }));
            }}
          />
        )}
      </Dialog>
    </>
  );
};
