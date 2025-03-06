import { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogContent,
} from "@mui/material";
import IWSRExplorer from "./iwsr";

interface Dataset {
  name: string;
  description: string;
  lastUpdated: string;
}

const datasets: Dataset[] = [
  {
    name: "IWSR Global Database",
    description: "Global alcoholic beverage market data and analytics",
    lastUpdated: "11/20/24",
  },
  {
    name: "NielsenIQ Spectra",
    description: "Consumer segmentation and market insights",
    lastUpdated: "2/1/2025",
  },
  {
    name: "Nielsen Scantrack",
    description: "Retail measurement and consumer insights",
    lastUpdated: "2/1/2025",
  },
  {
    name: "IRI Market Advantage",
    description: "CPG market intelligence and analytics",
    lastUpdated: "1/1/2025",
  },
  {
    name: "Numerator",
    description: "Consumer purchase behavior and insights",
    lastUpdated: "1/10/2025",
  },
  {
    name: "VIP iDig",
    description: "Account level depletion data",
    lastUpdated: "2/3/2025",
  },
  {
    name: "Jenda",
    description: "Price scraping and competitive intelligence",
    lastUpdated: "1/14/2025",
  },
  {
    name: "NABCA",
    description: "Control state pricing and analytics",
    lastUpdated: "2/1/2025",
  },
  {
    name: "Circana",
    description: "Retail analytics and market intelligence",
    lastUpdated: "1/12/2025",
  },
];

export const DataExplorer = () => {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  const handleDatasetClick = (datasetName: string) => {
    setSelectedDataset(datasetName);
  };

  const handleClose = () => {
    setSelectedDataset(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Explorer
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Browse and analyze third-party datasets
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Dataset</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Last Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow
                key={dataset.name}
                hover
                onClick={() => handleDatasetClick(dataset.name)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{dataset.name}</TableCell>
                <TableCell>{dataset.description}</TableCell>
                <TableCell>{dataset.lastUpdated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={selectedDataset === "IWSR Global Database"}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent>
          <IWSRExplorer />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
