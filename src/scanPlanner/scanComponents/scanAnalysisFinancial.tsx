import React, { useMemo } from "react";
import {
  Paper,
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Tab,
} from "@mui/material";
import {
  generateQD,
  generatePrice as generateRetailPrice,
  generateRetailerMargin,
} from "../scanPlayData/scanDataFn";
import { ProductEntry } from "./scanSidebarProducts";
import { getProjectedScanDollars } from "../scanUtil/scanUtil";

interface Props {
  products: ProductEntry[];
  selectedProductIdx: number;
  selectedWeekIdx: number | null;
  growthRate: number; // decimal, e.g., 0.05 for 5%
}

const ScanAnalysisFinancial: React.FC<Props> = ({
  products,
  selectedProductIdx,
  selectedWeekIdx,
}) => {
  const product = products[selectedProductIdx];
  const scan = product?.scans[selectedWeekIdx ?? -1];

  // Helper to get brand name (first token after dash, before size)
  const brandName = useMemo(() => {
    if (!product) return "";
    const dashIdx = product.name.indexOf(" - ");
    const variant =
      dashIdx !== -1 ? product.name.slice(dashIdx + 3) : product.name;
    return variant.split(" ")[0];
  }, [product?.name]);

  // --- Calculations ---
  // Projected Scan $ for the selected scan if already stored (preferred) or else compute quickly
  const computeProjected = (
    prod: ProductEntry,
    wk: string,
    amt: number
  ): number => {
    const dateObj = new Date(wk);
    if (isNaN(dateObj.getTime())) return 0;
    const monthIdx = dateObj.getMonth();
    const trendVal = prod.nielsenTrend?.[monthIdx]?.value ?? 0;
    // Use scan factor to equivalize to 9L
    const scanDollarsPer9L = getProjectedScanDollars(prod.name, amt);
    const projectedMonthly =
      Math.round(trendVal * (1 + (prod.growthRate || 0)) * 10) / 10;
    return projectedMonthly * scanDollarsPer9L;
  };

  const projectedScanValue = scan
    ? scan.projectedScan ?? computeProjected(product, scan.week, scan.scan)
    : 0;

  // --- Volume calculations ---
  const computeVolumeMetrics = (
    prod: ProductEntry,
    wk: string,
    amt: number
  ) => {
    const dateObj = new Date(wk);
    if (isNaN(dateObj.getTime()))
      return { projectedVolume: 0, volumeLift: 0, volumeLiftPct: 0 };
    const monthIdx = dateObj.getMonth();
    const trendVal = prod.nielsenTrend?.[monthIdx]?.value ?? 0;
    const baselineWeekly = trendVal / 4;
    const liftPct = Math.min(0.1, amt / 10);
    const projectedVolume = Math.round(baselineWeekly * (1 + liftPct));
    const volumeLift = Math.round(projectedVolume - baselineWeekly);
    const volumeLiftPct = baselineWeekly
      ? Math.round((volumeLift / baselineWeekly) * 1000) / 10
      : 0;
    return { projectedVolume, volumeLift, volumeLiftPct };
  };

  const volumeMetrics = scan
    ? {
        projectedVolume:
          scan.projectedVolume ??
          computeVolumeMetrics(product, scan.week, scan.scan).projectedVolume,
        volumeLift:
          scan.volumeLift ??
          computeVolumeMetrics(product, scan.week, scan.scan).volumeLift,
        volumeLiftPct:
          scan.volumeLiftPct ??
          computeVolumeMetrics(product, scan.week, scan.scan).volumeLiftPct,
      }
    : { projectedVolume: 0, volumeLift: 0, volumeLiftPct: 0 };

  // Aggregations over account and brand
  let accountProjected = 0;
  let brandProjected = 0;
  products.forEach((p) => {
    const pBrand = (() => {
      const dashIdx = p.name.indexOf(" - ");
      const variant = dashIdx !== -1 ? p.name.slice(dashIdx + 3) : p.name;
      return variant.split(" ")[0];
    })();
    p.scans.forEach((s) => {
      const val = s.projectedScan ?? computeProjected(p, s.week, s.scan);
      accountProjected += val;
      if (pBrand === brandName) brandProjected += val;
    });
  });

  // Aggregations for account level
  let accountProjectedVol = 0;
  let accountBaselineVol = 0;
  products.forEach((p) => {
    p.scans.forEach((s) => {
      const { projectedVolume, volumeLift } =
        s.projectedVolume !== undefined && s.volumeLift !== undefined
          ? { projectedVolume: s.projectedVolume, volumeLift: s.volumeLift }
          : computeVolumeMetrics(p, s.week, s.scan);
      accountProjectedVol += projectedVolume;
      accountBaselineVol += projectedVolume - volumeLift;
    });
  });
  const accountVolumeLift = accountProjectedVol - accountBaselineVol;
  const accountVolumeLiftPct = accountBaselineVol
    ? (accountVolumeLift / accountBaselineVol) * 100
    : 0;

  const qdValue = scan ? generateQD() : 0;
  const projectedRetail = scan ? generateRetailPrice() : 0;
  const retailerMargin = scan ? generateRetailerMargin() : 0;

  const formatCurrency = (num: number) =>
    `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const [tabIdx, setTabIdx] = React.useState(0);

  return (
    <Paper
      sx={{
        width: "100%",
        p: 0,
        height: 320,
        maxHeight: 320,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      variant="outlined"
    >
      <Box sx={{ px: 1, py: 1 }}>
        <Typography variant="subtitle2" textAlign="center">
          FINANCIAL METRICS
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabIdx}
          onChange={(_e, v) => setTabIdx(v)}
          variant="fullWidth"
        >
          <Tab label="Account" />
          <Tab label="Scan" />
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {scan ? (
          tabIdx === 0 ? (
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Account Projected Scan ($)</TableCell>
                  <TableCell align="right">
                    {formatCurrency(accountProjected)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Account Projected Vol (cases)</TableCell>
                  <TableCell align="right">
                    {accountProjectedVol.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vol. Lift (cases)</TableCell>
                  <TableCell align="right">
                    {accountVolumeLift.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vol. Lift (%)</TableCell>
                  <TableCell align="right">
                    {accountVolumeLiftPct.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{brandName} Projected Scan ($)</TableCell>
                  <TableCell align="right">
                    {formatCurrency(brandProjected)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Projected Scan ($)</TableCell>
                  <TableCell align="right">
                    {formatCurrency(projectedScanValue)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Projected Vol (cases)</TableCell>
                  <TableCell align="right">
                    {volumeMetrics.projectedVolume.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vol. Lift (cases)</TableCell>
                  <TableCell align="right">
                    {volumeMetrics.volumeLift.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vol. Lift (%)</TableCell>
                  <TableCell align="right">
                    {volumeMetrics.volumeLiftPct.toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>QD ($)</TableCell>
                  <TableCell align="right">{formatCurrency(qdValue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Projected Retail</TableCell>
                  <TableCell align="right">
                    {formatCurrency(projectedRetail)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Retailer Margin %</TableCell>
                  <TableCell align="right">
                    {retailerMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Select a scan to view financial metrics
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ScanAnalysisFinancial;
