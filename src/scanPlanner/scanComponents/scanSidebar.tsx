import React, { useState } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Divider,
} from '@mui/material';

import QualSidebar from '../../reusableComponents/qualSidebar';
import {
  SCAN_ACCOUNTS,
  SCAN_PRODUCTS,
  SCAN_MARKETS,
} from '../scanPlayData/scanData';
import ScanSidebarProducts, { ProductEntry } from './scanSidebarProducts';
import ScanSidebarScans from './scanSidebarScans';
import ScanAnalysisGraph from './scanAnalysisGraph';
import ScanAnalysisFinancial from './scanAnalysisFinancial';
import { generateNielsenTrend } from '../scanPlayData/scanDataFn';
import { buildPlannerRows } from '../scanCalculations/scanPlannerCalculations';
import { useAppDispatch, useAppSelector } from '../../redux/store';
import { saveClusterRows } from '../../redux/slices/scanSlice';
import { ScanExcelExportDialog } from '../scanUtil/scanExcelExportDialog';
import { exportScanPlanToExcel } from '../scanUtil/scanExcelExportUtil';

interface ClusterPayload {
  market: string;
  account: string;
  products: ProductEntry[];
}

interface ScanSidebarProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: ClusterPayload, clusterId?: string) => void;
  onDeleteCluster?: (clusterId: string) => void;
  initialData?: ClusterPayload;
  clusterId?: string;
  readOnly?: boolean;
  status?: 'draft' | 'review' | 'approved';
  role?: 'commercial' | 'finance';
}

const ScanSidebar: React.FC<ScanSidebarProps> = ({
  open,
  onClose,
  onAdd,
  onDeleteCluster,
  initialData,
  clusterId,
  readOnly = false,
  status = 'draft',
  role = 'commercial',
}) => {
  const [values, setValues] = useState<{ market: string; account: string }>({
    market: initialData?.market || '',
    account: initialData?.account || '',
  });

  const handleChange = (field: 'market' | 'account', value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const [products, setProducts] = React.useState<ProductEntry[]>(
    initialData?.products || [],
  );

  const isAddEnabled =
    values.market &&
    values.account &&
    products.length > 0 &&
    products.every((p) => p.scans.length > 0);

  // Reset / preload when sidebar opens with new data
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setValues({ market: initialData.market, account: initialData.account });
        setProducts(initialData.products);
      } else {
        // fresh creation
        setValues({ market: '', account: '' });
        setProducts([]);
      }
    }
  }, [open, initialData]);

  // Track selected indices for interaction between panes
  const [selectedProductIdx, setSelectedProductIdx] = React.useState<number>(0);
  const [selectedWeekIdx, setSelectedWeekIdx] = React.useState<number | null>(
    null,
  );

  // Ensure selected product has nielsenTrend generated
  React.useEffect(() => {
    const prod = products[selectedProductIdx];
    if (prod && !prod.nielsenTrend) {
      const trend = generateNielsenTrend();
      setProducts((prev) =>
        prev.map((p, idx) =>
          idx === selectedProductIdx ? { ...p, nielsenTrend: trend } : p,
        ),
      );
    }
  }, [selectedProductIdx, products]);

  const PRODUCT_NAMES: string[] = React.useMemo(() => {
    const names = new Set<string>();
    const addName = (obj: any) => {
      if (obj && typeof obj === 'object' && obj.variant_size_desc) {
        names.add(obj.variant_size_desc);
      }
    };
    SCAN_PRODUCTS.forEach((entry: any) => {
      if (Array.isArray(entry)) {
        entry.forEach(addName);
      } else {
        addName(entry);
      }
    });
    return Array.from(names).sort();
  }, []);

  const PRODUCT_NAMES_DROPDOWN: string[] = React.useMemo(() => {
    // Exclude products already added to the cluster
    const taken = new Set(products.map((p) => p.name));
    return PRODUCT_NAMES.filter((name) => !taken.has(name));
  }, [PRODUCT_NAMES, products]);

  // Snackbar for error messages
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });

  const showError = (msg: string) => setSnack({ open: true, msg });

  // Confirm delete dialog state
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.scan.mode);
  const plannerRows = useAppSelector((s) => s.scan.plannerRows as any[]);

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
        <Typography
          variant='subtitle2'
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            mx: 2,
            whiteSpace: 'nowrap',
          }}
        >
          STEP 1: PROVIDE BASIC INFO
        </Typography>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
      </Box>
      {/* Market & Account Row */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Autocomplete
          options={SCAN_MARKETS.map((m: any) => m.name) as readonly string[]}
          value={values.market || null}
          onChange={(_e, newVal) => handleChange('market', newVal || '')}
          disabled={readOnly}
          renderInput={(params) => (
            <TextField {...params} label='Market' fullWidth />
          )}
          autoHighlight
          sx={{ flex: 1 }}
        />
        <Autocomplete
          options={SCAN_ACCOUNTS as readonly string[]}
          value={values.account || null}
          onChange={(_e, newVal) => handleChange('account', newVal || '')}
          disabled={readOnly}
          renderInput={(params) => (
            <TextField {...params} label='Account' fullWidth />
          )}
          autoHighlight
          freeSolo
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Section: PRODUCT & SCANS / ANALYTICS */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
        <Typography
          variant='subtitle2'
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            mx: 2,
            whiteSpace: 'nowrap',
          }}
        >
          STEP 2: PROVIDE PRODUCT & SCAN AMOUNT
        </Typography>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
      </Box>
      {/* PRODUCT & SCANS grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <ScanSidebarProducts
          products={products}
          setProducts={setProducts}
          selectedProductIdx={selectedProductIdx}
          setSelectedProductIdx={setSelectedProductIdx}
          productNames={PRODUCT_NAMES_DROPDOWN}
          readOnly={readOnly}
        />
        <ScanSidebarScans
          products={products}
          setProducts={setProducts}
          selectedProductIdx={selectedProductIdx}
          selectedWeekIdx={selectedWeekIdx}
          setSelectedWeekIdx={setSelectedWeekIdx}
          showError={showError}
          readOnly={readOnly}
        />
      </Box>

      {/* Analytics label */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
        <Typography
          variant='subtitle2'
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            mx: 2,
            whiteSpace: 'nowrap',
          }}
        >
          STEP 3: ASSESS PROJECTED IMPACT
        </Typography>
        <Divider sx={{ flex: 1, bgcolor: 'grey.200', height: 1 }} />
      </Box>

      {/* ANALYTICS grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <ScanAnalysisGraph
          productEntry={products[selectedProductIdx]}
          growthRate={products[selectedProductIdx]?.growthRate || 0}
          onGrowthRateChange={(rate) => {
            setProducts((prev) =>
              prev.map((p, idx) =>
                idx === selectedProductIdx ? { ...p, growthRate: rate } : p,
              ),
            );
          }}
          readOnly={readOnly}
        />
        <ScanAnalysisFinancial
          products={products}
          selectedProductIdx={selectedProductIdx}
          selectedWeekIdx={selectedWeekIdx}
          growthRate={products[selectedProductIdx]?.growthRate || 0}
        />
      </Box>
    </Box>
  );

  const handleAdd = () => {
    if (!isAddEnabled) return;
    // Ensure every product has a persisted Nielsen trend before saving
    const ensuredProducts: ProductEntry[] = products.map((p) =>
      p.nielsenTrend ? p : { ...p, nielsenTrend: generateNielsenTrend() },
    );

    // Determine status based on mode and role
    let nextStatus: 'draft' | 'review' | 'approved' = 'draft';
    if (mode === 'forecast') {
      nextStatus = role === 'commercial' ? 'review' : 'approved';
    }

    const payload: ClusterPayload = {
      market: values.market,
      account: values.account,
      products: ensuredProducts,
    };
    onAdd(payload, clusterId);
    onClose();
    // reset
    setValues({ market: '', account: '' });
    setProducts([]);

    // compute planner rows and dispatch
    const rows = buildPlannerRows(
      payload,
      clusterId || 'cluster' + Date.now(),
      nextStatus,
    );
    dispatch(
      saveClusterRows({
        clusterId: (clusterId || rows[0]?.clusterId) ?? 'tmp',
        rows,
      }),
    );
  };

  // Approve handler (finance role)
  const handleApprove = () => {
    if (!clusterId) return;
    const rows = buildPlannerRows(
      {
        market: values.market,
        account: values.account,
        products,
      },
      clusterId,
      'approved',
    );
    dispatch(saveClusterRows({ clusterId, rows }));
    onClose();
  };

  // Reject handler – reverts status to draft for commercial revision
  const handleReject = () => {
    if (!clusterId) return;
    const updatedRows = plannerRows
      .filter((r: any) => r.clusterId === clusterId)
      .map((r: any) => ({ ...r, status: 'draft' }));
    dispatch(saveClusterRows({ clusterId, rows: updatedRows }));
    onClose();
  };

  /* Snackbar component */
  const errorSnack = (
    <Snackbar
      open={snack.open}
      autoHideDuration={3000}
      onClose={() => setSnack({ open: false, msg: '' })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setSnack({ open: false, msg: '' })}
        severity='error'
        sx={{ width: '100%' }}
      >
        {snack.msg}
      </Alert>
    </Snackbar>
  );

  const footerButtons: import('../../reusableComponents/qualSidebar').FooterButton[] =
    [
      {
        label: 'Close',
        variant: 'outlined',
        onClick: onClose,
      },
    ];

  if (!readOnly && role !== 'finance' && clusterId && onDeleteCluster) {
    footerButtons.push({
      label: 'Delete',
      variant: 'outlined',
      color: 'error',
      onClick: () => setConfirmOpen(true),
    });
  }

  // Finance approve & reject buttons when status is review
  if (role === 'finance' && status === 'review') {
    footerButtons.push({
      label: 'Approve',
      variant: 'contained',
      color: 'primary',
      onClick: handleApprove,
    });
    footerButtons.push({
      label: 'Reject',
      variant: 'contained',
      color: 'error',
      onClick: handleReject,
    });
  }

  if (!readOnly && role !== 'finance') {
    footerButtons.push({
      label: initialData ? 'Save Changes' : 'Add Scan',
      variant: 'contained',
      onClick: handleAdd,
      disabled: !isAddEnabled,
    });
  }

  // Export to Excel always available for approved clusters
  if (status === 'approved') {
    footerButtons.push({
      label: 'Export to Excel',
      variant: 'contained',
      align: 'left',
      onClick: () => setIsExportDialogOpen(true),
    });
  }

  // Update the export handler
  const handleExport = () => {
    if (!initialData) return;
    const rows = buildPlannerRows(
      {
        market: initialData.market,
        account: initialData.account,
        products,
      },
      clusterId || 'export',
      'approved',
    );
    setIsExportDialogOpen(true);
  };

  const handleExportConfirm = (selectedFields: string[]) => {
    if (!initialData) return;
    const rows = buildPlannerRows(
      {
        market: initialData.market,
        account: initialData.account,
        products,
      },
      clusterId || 'export',
      'approved',
    );
    exportScanPlanToExcel(rows as any, {
      selectedFields,
      fileName: `scan_plan_${clusterId || 'export'}.xlsx`,
    });
  };

  return (
    <QualSidebar
      open={open}
      onClose={onClose}
      title='Add Scan'
      width='1100px'
      footerButtons={footerButtons}
    >
      {content}
      {errorSnack}
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all scans in this cluster. Are you sure you want to
            proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant='outlined'>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (clusterId && onDeleteCluster) {
                onDeleteCluster(clusterId);
              }
              setConfirmOpen(false);
              onClose();
            }}
            color='error'
            variant='contained'
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Export Dialog */}
      <ScanExcelExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExportConfirm}
      />
    </QualSidebar>
  );
};

export default ScanSidebar;
