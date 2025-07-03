/* Guidance rendering utilities */
import React from "react";
import { Box, CircularProgress } from "@mui/material";
import type { Guidance } from "../../redux/guidance/guidanceSlice";
import { formatGuidanceValue } from "../calculations/guidanceCalculations";
import type { CalculatedGuidanceValue } from "../calculations/guidanceCalculations";

export interface GuidanceRendererProps {
  guidance: Guidance;
  /**
   * Result object holding the calculated values for this guidance.
   * For single calculations `total` is used, for multi-calc `multiCalc` is used.
   */
  calculationResult?: CalculatedGuidanceValue | { [key: string]: any };
  /** Status – shows spinner when "calculating" */
  calcStatus?: "idle" | "calculating" | "succeeded";
}

export const GuidanceRenderer: React.FC<GuidanceRendererProps> = ({
  guidance,
  calculationResult,
  calcStatus = "succeeded",
}) => {
  if (calcStatus === "calculating") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress size={16} thickness={4} />
      </Box>
    );
  }

  if (!calculationResult) {
    return <Box sx={{ display: "flex", justifyContent: "center" }}>-</Box>;
  }

  // ---- Multi-calc guidance (e.g., Trends) ----
  if (guidance.calculation.type === "multi_calc") {
    const multi = (calculationResult as any).multiCalc as
      | { [key: string]: number }
      | undefined;

    if (!multi) {
      return <Box sx={{ display: "flex", justifyContent: "center" }}>-</Box>;
    }

    const orderedIds =
      guidance.calculation.subCalculations?.map((sc) => sc.id) ||
      Object.keys(multi);

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          width: "100%",
          textAlign: "right",
        }}
      >
        {orderedIds.map((id) => (
          <Box key={id} sx={{ minWidth: "35px" }}>
            {formatGuidanceValue(multi[id], guidance.calculation.format)}
          </Box>
        ))}
      </Box>
    );
  }

  // ---- Single value guidance ----
  const val: number | undefined =
    (calculationResult as any).total ??
    (typeof calculationResult === "number" ? calculationResult : undefined);

  return (
    <>{formatGuidanceValue(val, guidance.calculation.format, guidance.label)}</>
  );
};

// --- Monthly renderer used by Summary expanded rows ---
interface MonthlyGuidanceRendererProps
  extends Omit<GuidanceRendererProps, "calcStatus" | "calculationResult"> {
  /** Month name in the same casing as MONTH_NAMES (e.g., "Jan"). */
  month: string;
  calculationResult?: CalculatedGuidanceValue;
  calcStatus?: "idle" | "calculating" | "succeeded";
}

export const MonthlyGuidanceRenderer: React.FC<
  MonthlyGuidanceRendererProps
> = ({ guidance, month, calculationResult, calcStatus = "succeeded" }) => {
  if (calcStatus === "calculating") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress size={12} thickness={4} />
      </Box>
    );
  }

  if (!calculationResult || !calculationResult.monthly) {
    return <Box sx={{ display: "flex", justifyContent: "center" }}>-</Box>;
  }

  const value = calculationResult.monthly[month];
  return (
    <>
      {formatGuidanceValue(value, guidance.calculation.format, guidance.label)}
    </>
  );
};

export default GuidanceRenderer;
