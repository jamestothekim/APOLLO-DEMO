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
import { useState, useEffect } from "react";
import { TransactionData, generateTransactionData } from "../../../data/data";

interface DepletionDetailsProps {
  market: string;
  item: string;
  value: number;
  onRetailerClick: (vipId: string, premiseType: string, name: string) => void;
}

export const DepletionDetails = ({
  market,
  item,
  value,
  onRetailerClick,
}: DepletionDetailsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    setTransactions(generateTransactionData(value));
  }, [value]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
              <TableCell>VIP ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Retailer</TableCell>
              <TableCell align="right">Volume</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((transaction, index) => (
                <TableRow
                  key={index}
                  hover
                  onClick={() => {
                    onRetailerClick(
                      transaction.vipId,
                      transaction.venue.type,
                      transaction.venue.name
                    );
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{transaction.vipId}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.venue.type}</TableCell>
                  <TableCell>{transaction.venue.name}</TableCell>
                  <TableCell align="right">{transaction.volume}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 30]}
        component="div"
        count={transactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
};
