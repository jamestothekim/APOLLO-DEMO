import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Divider,
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
  onExport: (config: ExportFieldConfig, fileName: string) => void;
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
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedRetailer, setSelectedRetailer] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fieldConfig, setFieldConfig] =
    useState<ExportFieldConfig>(DEFAULT_FIELDS);

  // Auto-generate filename when market or retailer changes
  useEffect(() => {
    if (selectedMarket || selectedRetailer) {
      const today = new Date().toISOString().split('T')[0];
      const marketName =
        markets.find((m) => m.id === selectedMarket)?.name?.toLowerCase() || '';
      const retailerName =
        retailers.find((r) => r.id === selectedRetailer)?.name?.toLowerCase() ||
        '';

      let title = 'scan_calendar';
      if (marketName) title += `_${marketName.replace(/\s+/g, '_')}`;
      if (retailerName) title += `_${retailerName.replace(/\s+/g, '_')}`;
      title += `_${today}`;

      setFileName(title);
    }
  }, [selectedMarket, selectedRetailer, markets, retailers]);

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
    onExport(fieldConfig, fileName);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setSelectedMarket('');
    setSelectedRetailer('');
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
            <FormControl fullWidth>
              <InputLabel>Market</InputLabel>
              <Select
                value={selectedMarket}
                label='Market'
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                <MenuItem value=''>
                  <em>All Markets</em>
                </MenuItem>
                {markets.map((market) => (
                  <MenuItem key={market.id} value={market.id}>
                    {market.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Retailer</InputLabel>
              <Select
                value={selectedRetailer}
                label='Retailer'
                onChange={(e) => setSelectedRetailer(e.target.value)}
              >
                <MenuItem value=''>
                  <em>All Retailers</em>
                </MenuItem>
                {retailers.map((retailer) => (
                  <MenuItem key={retailer.id} value={retailer.id}>
                    {retailer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
