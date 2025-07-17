import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, MenuItem, Stack } from "@mui/material";
import {
  MARKETS,
  PROGRAMS,
  BRANDS,
  Brand,
  MarketingProgram,
} from "../marketingPlayData/marketingData";
import QualSidebar, {
  SidebarSection,
} from "../../reusableComponents/qualSidebar";
// import { InteractiveGraph } from "../../reusableComponents/interactiveGraph"; // Unused for now
import { MonthlyValues } from "../../reusableComponents/monthlyValues";

interface MarketingSidebarProps {
  open: boolean;
  onClose: () => void;
  onSave: (program: MarketingProgram) => void;
  initialData?: MarketingProgram | null;
  editMode: boolean;
}

// Utility function for robust redistribution - currently unused
/*
function redistributeMonths(
  months: { [key: string]: number },
  changedMonth: string,
  newValue: number,
  total: number,
  minPerMonth = 0
) {
  const monthKeys = Object.keys(months);
  const oldValue = months[changedMonth] || 0;
  // Calculate how much can be taken from other months (above their minimum)
  let available = 0;
  monthKeys.forEach((m) => {
    if (m !== changedMonth) available += Math.max(0, months[m] - minPerMonth);
  });
  const maxValue = oldValue + available;
  let clampedValue = Math.max(minPerMonth, Math.min(newValue, maxValue));
  let delta = clampedValue - oldValue;
  let newMonths = { ...months, [changedMonth]: clampedValue };

  // Now, take -delta from other months, but never below minPerMonth
  let remainingDelta = -delta;
  let otherKeys = monthKeys.filter((m) => m !== changedMonth);
  while (Math.abs(remainingDelta) > 1e-6 && otherKeys.length > 0) {
    let share = remainingDelta / otherKeys.length;
    let nextKeys: string[] = [];
    for (let m of otherKeys) {
      let maxTake = newMonths[m] - minPerMonth;
      if (share < 0 && Math.abs(share) > maxTake) {
        remainingDelta += maxTake;
        newMonths[m] = minPerMonth;
      } else {
        newMonths[m] += share;
        remainingDelta -= share;
        nextKeys.push(m);
      }
    }
    otherKeys = nextKeys;
  }
  // Final rounding to nearest dollar for all months
  let roundedMonths = { ...newMonths };
  Object.keys(roundedMonths).forEach((m) => {
    roundedMonths[m] = Math.round(roundedMonths[m]);
  });
  let sum = Object.values(roundedMonths).reduce((a, b) => a + b, 0);
  let roundingDelta = total - sum;
  if (roundingDelta !== 0) {
    roundedMonths[changedMonth] += roundingDelta;
  }
  return roundedMonths;
}
*/

const MarketingSidebar: React.FC<MarketingSidebarProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  editMode,
}) => {
  const [formData, setFormData] = useState<Partial<MarketingProgram>>({
    market: 0,
    brand: 0,
    program: 0,
    total_ty: 0,
    months: {},
    notes: "",
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        id: initialData.id,
        market: initialData.market,
        brand: initialData.brand,
        program: initialData.program,
        total_ty: initialData.total_ty,
        months: { ...initialData.months },
        notes: initialData.notes,
      });
    } else if (!editMode && open) {
      setFormData({
        market: 0,
        brand: 0,
        program: 0,
        total_ty: 0,
        months: {},
        notes: "",
      });
    }
  }, [editMode, initialData, open]);

  const handleMonthChange = (month: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Directly update the month value without redistribution
    const newMonths = { ...formData.months, [month]: numValue };
    const newTotal = Object.values(newMonths).reduce(
      (sum, val) => sum + val,
      0
    );
    setFormData((prev) => ({
      ...prev,
      months: newMonths,
      total_ty: newTotal,
    }));
  };

  const handleTotalChange = (value: string) => {
    const totalAmount = parseFloat(value) || 0;
    const flat = Math.round(totalAmount / 12);
    const monthsList = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthsObj: { [key: string]: number } = {};
    monthsList.forEach((m) => (monthsObj[m] = flat));
    setFormData((prev) => ({
      ...prev,
      total_ty: totalAmount,
      months: monthsObj,
    }));
  };

  // Unused function - can be enabled when interactive graph is added
  /*
  const handleDistributionChange = (newDistribution: {
    [key: string]: number;
  }) => {
    // If the distribution is all 0s and 1s, treat as weights (preset)
    const weights = Object.values(newDistribution);
    const isWeights =
      weights.every((v) => v === 0 || v === 1) && weights.some((v) => v === 1);
    if (isWeights) {
      const months = Object.keys(newDistribution);
      const numActive = months.filter((m) => newDistribution[m] === 1).length;
      const perMonth = numActive > 0 ? (formData.total_ty || 0) / numActive : 0;
      const newMonths: { [key: string]: number } = {};
      months.forEach((m) => {
        newMonths[m] = newDistribution[m] === 1 ? perMonth : 0;
      });
      setFormData((prev) => ({
        ...prev,
        months: newMonths,
        // total_ty stays locked!
      }));
      return;
    }
    // Otherwise, use redistributeMonths as before
    const prevMonths = formData.months || {};
    let changedMonth =
      Object.keys(newDistribution).find(
        (m) => (newDistribution[m] || 0) !== (prevMonths[m] || 0)
      ) || Object.keys(newDistribution)[0];
    const newValue = newDistribution[changedMonth];
    const newMonths = redistributeMonths(
      prevMonths,
      changedMonth,
      newValue,
      formData.total_ty || 0,
      0
    );
    setFormData((prev) => ({
      ...prev,
      months: newMonths,
      // total_ty stays locked!
    }));
  };
  */

  const handleSave = () => {
    if (formData.market && formData.brand && formData.program) {
      onSave({
        id: formData.id || 0,
        market: formData.market,
        brand: formData.brand,
        program: formData.program,
        total_ty: formData.total_ty || 0,
        months: formData.months || {},
        notes: formData.notes || "",
      });
    }
  };

  // Prepare quarterGroups for MonthlyValues
  const monthsList = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const quarterGroups = quarterLabels.map((label, i) => ({
    label,
    months: monthsList.slice(i * 3, i * 3 + 3).map((month) => ({
      month,
      value: formData.months?.[month] || 0,
      isActual: false,
      isManuallyModified: false,
    })),
  }));

  const sections: SidebarSection[] = [
    {
      title: "Program Details",
      content: (
        <Stack spacing={3}>
          <TextField
            select
            fullWidth
            label="Market"
            value={formData.market || ""}
            onChange={(e) =>
              setFormData({ ...formData, market: Number(e.target.value) })
            }
            InputLabelProps={{ color: "primary" }}
          >
            {MARKETS.map((market) => (
              <MenuItem key={market.id} value={market.id}>
                {market.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Brand"
            value={formData.brand !== undefined ? String(formData.brand) : ""}
            onChange={(e) =>
              setFormData({ ...formData, brand: Number(e.target.value) })
            }
            InputLabelProps={{ color: "primary" }}
          >
            {BRANDS.map((brand: Brand) => (
              <MenuItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Program"
            value={formData.program || ""}
            onChange={(e) =>
              setFormData({ ...formData, program: Number(e.target.value) })
            }
            InputLabelProps={{ color: "primary" }}
          >
            {PROGRAMS.map((program) => (
              <MenuItem key={program.id} value={program.id}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Typography>{program.program_name}</Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", ml: 1 }}
                  >
                    {program.category}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      ),
    },
    {
      title: "ANNUAL SPEND",
      content: (
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Total Annual Amount"
            type="text"
            value={
              formData.total_ty !== undefined
                ? Number(formData.total_ty).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                    useGrouping: true,
                  })
                : ""
            }
            onChange={(e) => {
              // Remove commas for parsing
              const raw = e.target.value.replace(/,/g, "");
              handleTotalChange(raw);
            }}
            InputProps={{
              startAdornment: (
                <Typography variant="caption" sx={{ mr: 1 }}>
                  $
                </Typography>
              ),
            }}
            InputLabelProps={{ color: "primary" }}
          />

          {/* Interactive graph removed for now - can be added back with proper props */}

          <MonthlyValues
            quarterGroups={quarterGroups}
            onMonthValueChange={handleMonthChange}
          />
        </Stack>
      ),
    },
    {
      title: "Additional Information",
      content: (
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Commentary"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          InputLabelProps={{ color: "primary" }}
          placeholder="Add your comments here..."
        />
      ),
    },
  ];

  return (
    <QualSidebar
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Marketing Program" : "Add Marketing Program"}
      width="600px"
      sections={sections}
      footerButtons={[
        {
          label: "Cancel",
          onClick: onClose,
          variant: "outlined",
        },
        {
          label: "Save Changes",
          onClick: handleSave,
          variant: "contained",
          disabled: !formData.market || !formData.brand || !formData.program,
        },
      ]}
    />
  );
};

export default MarketingSidebar;
