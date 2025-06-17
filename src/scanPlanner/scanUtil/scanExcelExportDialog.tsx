import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Divider,
} from '@mui/material';

interface ExportField {
  id: string;
  label: string;
  category: string;
  defaultChecked?: boolean;
}

const EXPORT_FIELDS: ExportField[] = [
  // Basic Info
  {
    id: 'market',
    label: 'Market',
    category: 'Basic Info',
    defaultChecked: true,
  },
  {
    id: 'account',
    label: 'Account',
    category: 'Basic Info',
    defaultChecked: true,
  },
  {
    id: 'product',
    label: 'Product',
    category: 'Basic Info',
    defaultChecked: true,
  },
  {
    id: 'clusterId',
    label: 'Cluster ID',
    category: 'Basic Info',
    defaultChecked: true,
  },

  // Scan Details
  {
    id: 'scanWeek',
    label: 'Scan Week',
    category: 'Scan Details',
    defaultChecked: true,
  },
  {
    id: 'scanAmount',
    label: 'Scan Amount',
    category: 'Scan Details',
    defaultChecked: true,
  },
  {
    id: 'scanValue',
    label: 'Scan Value',
    category: 'Scan Details',
    defaultChecked: true,
  },

  // Financial Info
  {
    id: 'growthRate',
    label: 'Growth Rate',
    category: 'Financial Info',
    defaultChecked: true,
  },
  {
    id: 'projectedValue',
    label: 'Projected Value',
    category: 'Financial Info',
    defaultChecked: true,
  },
  {
    id: 'totalValue',
    label: 'Total Value',
    category: 'Financial Info',
    defaultChecked: true,
  },

  // Status
  { id: 'status', label: 'Status', category: 'Status', defaultChecked: true },
  {
    id: 'createdBy',
    label: 'Created By',
    category: 'Status',
    defaultChecked: true,
  },
  {
    id: 'createdDate',
    label: 'Created Date',
    category: 'Status',
    defaultChecked: true,
  },
];

interface ScanExcelExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (selectedFields: string[]) => void;
}

export const ScanExcelExportDialog: React.FC<ScanExcelExportDialogProps> = ({
  open,
  onClose,
  onExport,
}) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter((field) => field.defaultChecked).map(
      (field) => field.id,
    ),
  );

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId],
    );
  };

  const handleExport = () => {
    onExport(selectedFields);
    onClose();
  };

  const groupedFields = EXPORT_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ExportField[]>);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Configure Excel Export</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {Object.entries(groupedFields).map(([category, fields]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography
                variant='subtitle1'
                sx={{ mb: 1, fontWeight: 'bold' }}
              >
                {category}
              </Typography>
              <FormGroup>
                {fields.map((field) => (
                  <FormControlLabel
                    key={field.id}
                    control={
                      <Checkbox
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                      />
                    }
                    label={field.label}
                  />
                ))}
              </FormGroup>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant='contained'
          color='primary'
          disabled={selectedFields.length === 0}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
};
