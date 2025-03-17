import React from "react";
import { Box, Typography, Chip, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/material/styles";

export interface FieldConfig {
  name: string;
  label: string;
  fieldType: string;
  value?: string;
  editable?: boolean;
  chipProps?: {
    size?: "small" | "medium";
    variant?: "outlined" | "filled";
    color?: "primary" | "secondary" | "default";
    sx?: any;
  };
}

interface DynamicFormProps {
  fields: FieldConfig[];
  data: Record<string, any>;
  onEdit: (field: FieldConfig) => void;
}

const StyledBox = styled(Box)(({ theme }) => ({
  "& .MuiTypography-root": {
    color: theme.palette.text.primary,
  },
}));

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  data,
  onEdit,
}) => {
  const theme = useTheme();

  const renderField = (field: FieldConfig) => {
    const value = data[field.name];

    switch (field.fieldType) {
      case "chip":
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {Array.isArray(value) && value.length > 0 ? (
              value.map((item) => (
                <Chip key={item} label={item} {...field.chipProps} />
              ))
            ) : (
              <Typography variant="body2">No items</Typography>
            )}
          </Box>
        );
      default:
        return (
          <Typography variant="body2" color="text.primary">
            {value != null ? String(value) : ""}
          </Typography>
        );
    }
  };

  // Filter out fields with no data for display
  const visibleFields = fields.filter((field) => {
    const value = data[field.name];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value != null && value !== "";
  });

  return (
    <Paper elevation={0}>
      <StyledBox>
        {visibleFields.map((field) => (
          <Box
            key={field.name}
            onClick={() => field.editable !== false && onEdit(field)}
            sx={{
              display: "flex",
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              cursor: field.editable !== false ? "pointer" : "default",
              "&:hover": {
                backgroundColor:
                  field.editable !== false
                    ? theme.palette.action.hover
                    : "transparent",
              },
              "&:last-child": {
                borderBottom: "none",
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                minWidth: 150,
                fontWeight: "medium",
              }}
            >
              {field.label}
            </Typography>
            <Box sx={{ flex: 1 }}>{renderField(field)}</Box>
          </Box>
        ))}
      </StyledBox>
    </Paper>
  );
};
