import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Divider,
  Chip,
  Autocomplete,
} from '@mui/material';

export interface ExportFieldConfig {
  bottleCost: boolean;
  frontlineSRP: boolean;
  frontlineMargin: boolean;
  scan: boolean;
  promoSRP: boolean;
  promoMargin: boolean;
  loyaltyPerBottle: boolean;
  loyaltyOffer: boolean;
  comment: boolean;
}

interface FinanceExportConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (
    config: ExportFieldConfig,
    fileName: string,
    selectedMarkets: string[],
    selectedRetailers: string[],
  ) => void;
  markets: Array<{ id: string; name: string }>;
  retailers: Array<{ id: string; name: string }>;
}

const DEFAULT_FIELDS: ExportFieldConfig = {
  bottleCost: true,
  frontlineSRP: true,
  frontlineMargin: true,
  scan: true,
  promoSRP: true,
  promoMargin: true,
  loyaltyPerBottle: true,
  loyaltyOffer: true,
  comment: true,
};

const FIELD_LABELS = {
  bottleCost: 'BOTTLE COST',
  frontlineSRP: 'FRONTLINE SRP',
  frontlineMargin: 'FRONTLINE MARGIN %',
  scan: 'SCAN',
  promoSRP: 'PROMO SRP',
  promoMargin: 'PROMO MARGIN %',
  loyaltyPerBottle: 'LOYALTY PER BOTTLE',
  loyaltyOffer: 'LOYALTY OFFER',
  comment: 'COMMENT',
};

export const FinanceExportConfigDialog: React.FC<
  FinanceExportConfigDialogProps
> = ({ open, onClose, onExport, markets, retailers }) => {
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fieldConfig, setFieldConfig] =
    useState<ExportFieldConfig>(DEFAULT_FIELDS);

  // Auto-generate filename when markets or retailers change
  useEffect(() => {
    if (selectedMarkets.length > 0 || selectedRetailers.length > 0) {
      const today = new Date().toISOString().split('T')[0];

      let title = 'scan_calendar';

      if (selectedMarkets.length > 0) {
        if (selectedMarkets.length === 1) {
          const marketName =
            markets
              .find((m) => m.id === selectedMarkets[0])
              ?.name?.toLowerCase() || '';
          title += `_${marketName.replace(/\s+/g, '_')}`;
        } else {
          title += `_${selectedMarkets.length}_markets`;
        }
      }

      if (selectedRetailers.length > 0) {
        if (selectedRetailers.length === 1) {
          const retailerName =
            retailers
              .find((r) => r.id === selectedRetailers[0])
              ?.name?.toLowerCase() || '';
          title += `_${retailerName.replace(/\s+/g, '_')}`;
        } else {
          title += `_${selectedRetailers.length}_retailers`;
        }
      }

      title += `_${today}`;
      setFileName(title);
    }
  }, [selectedMarkets, selectedRetailers, markets, retailers]);

  const handleFieldToggle = (field: keyof ExportFieldConfig) => {
    setFieldConfig((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(fieldConfig).every(Boolean);
    const newConfig = Object.keys(fieldConfig).reduce(
      (acc, key) => ({
        ...acc,
        [key]: !allSelected,
      }),
      {} as ExportFieldConfig,
    );
    setFieldConfig(newConfig);
  };

  const handleExport = () => {
    onExport(fieldConfig, fileName, selectedMarkets, selectedRetailers);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setSelectedMarkets([]);
    setSelectedRetailers([]);
    setFileName('');
    setFieldConfig(DEFAULT_FIELDS);
    onClose();
  };

  const selectedFieldCount = Object.values(fieldConfig).filter(Boolean).length;
  const allFieldsSelected = Object.values(fieldConfig).every(Boolean);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Typography variant='h6' component='div'>
          Configure Excel Export
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Market and Retailer Selection */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Autocomplete
              multiple
              limitTags={2}
              options={markets}
              getOptionLabel={(option) => option.name}
              value={markets.filter((m) => selectedMarkets.includes(m.id))}
              onChange={(_, newValue) =>
                setSelectedMarkets(newValue.map((m) => m.id))
              }
              renderInput={(params) => (
                <TextField {...params} label='Filter Markets' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size='small'
                    variant='outlined'
                    color='primary'
                    sx={{
                      borderRadius: '16px',
                      backgroundColor: 'transparent',
                      '& .MuiChip-label': { px: 1 },
                    }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              sx={{ flex: 1, minWidth: 180 }}
            />
            <Autocomplete
              multiple
              limitTags={2}
              options={retailers}
              getOptionLabel={(option) => option.name}
              value={retailers.filter((r) => selectedRetailers.includes(r.id))}
              onChange={(_, newValue) =>
                setSelectedRetailers(newValue.map((r) => r.id))
              }
              renderInput={(params) => (
                <TextField {...params} label='Filter Retailers' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size='small'
                    variant='outlined'
                    color='primary'
                    sx={{
                      borderRadius: '16px',
                      backgroundColor: 'transparent',
                      '& .MuiChip-label': { px: 1 },
                    }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Box>

          {/* File Name */}
          <TextField
            fullWidth
            label='File Name'
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            sx={{ mb: 3 }}
            helperText='File name will be auto-generated based on your selections'
          />

          <Divider sx={{ mb: 3 }} />

          {/* Field Selection */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h6'>
              Select Fields to Export ({selectedFieldCount} of{' '}
              {Object.keys(fieldConfig).length} selected)
            </Typography>
            <Button variant='outlined' size='small' onClick={handleSelectAll}>
              {allFieldsSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>

          <FormGroup>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
              }}
            >
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={fieldConfig[key as keyof ExportFieldConfig]}
                      onChange={() =>
                        handleFieldToggle(key as keyof ExportFieldConfig)
                      }
                    />
                  }
                  label={label}
                />
              ))}
            </Box>
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant='contained'
          color='primary'
          disabled={selectedFieldCount === 0 || !fileName.trim()}
        >
          Export Excel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
