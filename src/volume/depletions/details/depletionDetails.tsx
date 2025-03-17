import {
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import { useState } from "react";

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

export const DepletionDetails = ({
  market,
  item,

  accountLevelSalesData,
}: DepletionDetailsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>City/State</TableCell>
              <TableCell>Premise Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Qty (9L)</TableCell>
              <TableCell>Sales ($)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accountLevelSalesData.map((data, index) => (
              <TableRow key={index}>
                <TableCell>{data.outlet_name}</TableCell>
                <TableCell>{`${data.city}, ${data.state}`}</TableCell>
                <TableCell>{data.premise_type}</TableCell>
                <TableCell>{data.account_type}</TableCell>
                <TableCell>{data.case_equivalent_quantity}</TableCell>
                <TableCell>{data.sales_dollars}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 30]}
        component="div"
        count={accountLevelSalesData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </>
  );
};
