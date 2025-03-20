import React, { useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export type CustomColumnType = "TOTAL" | "BUDGET" | "VS_BUDGET" | "TO_GO";

interface CustomColumnOption {
  value: CustomColumnType;
  label: string;
  description: string;
}

const CUSTOM_COLUMN_OPTIONS: CustomColumnOption[] = [
  {
    value: "TOTAL",
    label: "TOTAL",
    description: "Sum of all previous columns",
  },
  {
    value: "BUDGET",
    label: "BUDGET",
    description: "Sum of budget dataset",
  },
  {
    value: "VS_BUDGET",
    label: "% vs. BUDGET",
    description: "Percentage difference between total and budget",
  },
  {
    value: "TO_GO",
    label: "% TO GO",
    description: "Percentage remaining to hit budget",
  },
];

interface CustomColumnProps {
  onAddColumn: (type: CustomColumnType) => void;
  onRemoveColumn: (columnId: string) => void;
  customColumns: { id: string; type: CustomColumnType }[];
}

export const CustomColumnControls: React.FC<CustomColumnProps> = ({
  onAddColumn,
  onRemoveColumn,
  customColumns,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdd = (type: CustomColumnType) => {
    onAddColumn(type);
    handleClose();
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Add Custom Column">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ ml: 1 }}
          aria-label="add custom column"
        >
          <AddIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {CUSTOM_COLUMN_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleAdd(option.value)}
            sx={{ minWidth: 200 }}
          >
            <Box>
              <Typography variant="body1">{option.label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {customColumns.map((column) => (
        <Tooltip
          key={column.id}
          title={`Remove ${
            CUSTOM_COLUMN_OPTIONS.find((opt) => opt.value === column.type)
              ?.label
          }`}
        >
          <IconButton
            size="small"
            onClick={() => onRemoveColumn(column.id)}
            sx={{ ml: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};

export const generateCustomColumn = (
  type: CustomColumnType,
  id: string,
  budgetData: any,
  months: string[]
) => {
  const calculateTotal = (row: any) => {
    return months.reduce((sum, month) => sum + (row[`month_${month}`] || 0), 0);
  };

  const calculateBudget = (row: any) => {
    const budgetRow = budgetData.find(
      (budget: any) => budget.id === `budget-${row.id}`
    );
    if (!budgetRow) return 0;

    return Object.values(budgetRow.months).reduce(
      (acc: number, curr: any) => acc + curr.value,
      0
    );
  };

  const calculateVsBudget = (row: any) => {
    const total = calculateTotal(row);
    const budget = calculateBudget(row);
    if (budget === 0) return 0;
    return ((total - budget) / budget) * 100;
  };

  const calculateToGo = (row: any) => {
    const actualMonths = months.filter(
      (month) => row._originalData.months[month]?.isActual
    );
    const actualTotal = actualMonths.reduce(
      (sum, month) => sum + (row[`month_${month}`] || 0),
      0
    );
    const budget = calculateBudget(row);
    if (budget === 0) return 0;
    return ((budget - actualTotal) / budget) * 100;
  };

  const calculations = {
    TOTAL: calculateTotal,
    BUDGET: calculateBudget,
    VS_BUDGET: calculateVsBudget,
    TO_GO: calculateToGo,
  };

  const formatters = {
    TOTAL: (value: number) => value.toLocaleString(),
    BUDGET: (value: number) => value.toLocaleString(),
    VS_BUDGET: (value: number) => `${value.toFixed(1)}%`,
    TO_GO: (value: number) => `${Math.round(value)}%`,
  };

  return {
    id,
    type,
    label: CUSTOM_COLUMN_OPTIONS.find((opt) => opt.value === type)?.label || "",
    calculate: (row: any) => {
      const value = calculations[type](row);
      return formatters[type](value);
    },
  };
};
