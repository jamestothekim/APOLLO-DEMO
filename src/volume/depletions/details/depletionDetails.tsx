import { DialogTitle, Box, Typography } from "@mui/material";
import { useState } from "react";
import { DynamicTable } from "../../../reusableComponents/dynamicTable";

interface DepletionDetailsProps {
  market: string;
  item: string;
  value: number;
  month: any;
  year: number;
  variant_size_pack: string;
  onRetailerClick: (vipId: string, premiseType: string, name: string) => void;
  accountLevelSalesData: any[];
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
}: DepletionDetailsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      key: "quantity",
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

      <DynamicTable
        data={accountLevelSalesData}
        columns={columns}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </>
  );
};
