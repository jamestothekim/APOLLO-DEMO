import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store'; // adjust path accordingly
import { deleteClusterRows, setPlannerRows } from '../redux/slices/scanSlice';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Chip,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TableChartIcon from '@mui/icons-material/TableChart';
import { DynamicTable, type Column } from '../reusableComponents/dynamicTable';
import ScanSidebar from './scanComponents/scanSidebar';
import { SCAN_MARKETS } from './scanPlayData/scanData';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PendingIcon from '@mui/icons-material/Pending';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { ProductEntry } from './scanComponents/scanSidebarProducts';
import {
  FinanceExportConfigDialog,
  type ExportFieldConfig,
} from './scanUtil/FinanceExportConfigDialog';
import { exportFinanceExcel } from './scanUtil/financeExportUtil';

interface ScanRow {
  id: string;
  clusterId: string;
  rowType: 'week';
  market: string;
  account: string;
  product: string;
  week: string;
  scanAmount: number;
  totalScan: number;
  projectedScan: number;
  projectedRetail: number;
  qd: number;
  retailerMargin: number;
  loyalty: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'review';
  comments?: string;
}

interface ClusterPayload {
  market: string;
  account: string;
  products: ProductEntry[];
}

// Helper: determine if current user can edit a cluster given app mode and its status
const canEditCluster = (
  role: 'commercial' | 'finance',
  mode: 'budget' | 'forecast',
  status: 'draft' | 'review' | 'approved',
) => {
  if (role === 'finance') return false; // Finance never edits directly
  if (mode === 'budget') {
    // Commercial can only edit draft clusters in Budget mode
    return status === 'draft';
  }
  // Forecast mode – commercial can always edit (draft, review, approved)
  return true;
};

export const ScanPlanner: React.FC = () => {
  const dispatch = useDispatch();
  const rows: ScanRow[] = useSelector(
    (state: RootState) => state.scan.plannerRows as ScanRow[],
  );
  const mode = useSelector((s: RootState) => s.scan.mode);
  const isLocked = rows.some(
    (r) => r.status === 'review' || r.status === 'approved',
  );
  const hasReview = rows.some((r) => r.status === 'review');
  const hasApproved = rows.some((r) => r.status === 'approved');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoverClusterId, setHoverClusterId] = useState<string | null>(null);
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [editingPayload, setEditingPayload] = useState<ClusterPayload | null>(
    null,
  );
  const [sidebarReadOnly, setSidebarReadOnly] = useState(false);
  const [sidebarStatus, setSidebarStatus] = useState<
    'draft' | 'review' | 'approved'
  >('draft');
  const [role, setRole] = useState<'commercial' | 'finance'>('commercial');

  const theme = useTheme();

  // --- Export Config Dialog State ---
  const [exportConfigDialogOpen, setExportConfigDialogOpen] = useState(false);

  // --- Publish Dialog State ---
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishComment, setPublishComment] = useState('');
  const [publishCommentError, setPublishCommentError] = useState(false);
  const [publishConfirmationText, setPublishConfirmationText] = useState('');
  const [publishConfirmationError, setPublishConfirmationError] =
    useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    msg: string;
    severity: 'success' | 'error';
  }>({ open: false, msg: '', severity: 'success' });

  const showSnackbar = (
    msg: string,
    severity: 'success' | 'error' = 'success',
  ) => setSnackbar({ open: true, msg, severity });

  const handleSaveCluster = (_payload: ClusterPayload, _clusterId?: string) => {
    /* Row construction and saving are now handled inside ScanSidebar via saveClusterRows. */
  };

  // --- Export Handler ---
  const handleExportConfig = async (
    config: ExportFieldConfig,
    fileName: string,
    selectedMarkets: string[],
    selectedRetailers: string[],
  ) => {
    try {
      await exportFinanceExcel(
        rows,
        config,
        fileName,
        SCAN_MARKETS,
        retailerOptions,
        selectedMarkets,
        selectedRetailers,
      );
      showSnackbar('Excel file exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar('Failed to export Excel file', 'error');
    }
  };

  const columns: Column[] = [
    {
      key: 'market',
      header: 'Market',
      sortable: true,
      render: (market: string) => {
        const m = SCAN_MARKETS.find((mk: any) => mk.name === market);
        const text = m ? m.abbr : market;
        return text;
      },
    },
    {
      key: 'account',
      header: 'Account',
      sortable: true,
    },
    {
      key: 'product',
      header: 'Product',
      sortable: true,
      render: (product?: string) => {
        if (!product) return '';
        const firstDashIndex = product.indexOf(' - ');
        return firstDashIndex !== -1
          ? product.slice(firstDashIndex + 3)
          : product;
      },
    },
    {
      key: 'week',
      header: 'Week',
      sortable: true,
    },
    {
      key: 'scanAmount',
      header: 'Scan ($)',
      align: 'right',
      render: (v: number) => (v ?? 0).toFixed(2),
    },
    {
      key: 'projectedScan',
      header: 'Projected Scan ($)',
      align: 'right' as const,
      render: (_: any, row: any) =>
        (row.projectedScan ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: 'projectedRetail',
      header: 'Proj. Retail ($)',
      align: 'right' as const,
      render: (_: any, row: any) =>
        (row.projectedRetail ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: 'qd',
      header: 'QD ($)',
      align: 'right' as const,
      render: (_: any, row: any) => (row.qd ?? 0).toLocaleString(),
    },
    {
      key: 'loyalty',
      header: 'Loyalty ($)',
      align: 'right' as const,
      render: (_: any, row: any) =>
        (row.loyalty ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: 'retailerMargin',
      header: 'Retail Margin %',
      align: 'right' as const,
      render: (_: any, row: any) => (row.retailerMargin ?? 0).toFixed(1) + '%',
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'approved') {
          return <CheckCircleIcon color='primary' titleAccess='Approved' />;
        }
        if (status === 'review') {
          return <PendingIcon color='secondary' titleAccess='Review' />;
        }
        // Draft/default
        return <PendingActionsIcon color='secondary' titleAccess='Draft' />;
      },
    },
  ];

  // Build unique option lists
  const marketOptions = SCAN_MARKETS.map((m: any) => m.name);
  const retailerOptions = Array.from(new Set(rows.map((r) => r.account)));
  const productOptions = Array.from(new Set(rows.map((r) => r.product)));

  // Filter rows based on selections
  const filteredRows = rows.filter((r) => {
    if (selectedMarkets.length && !selectedMarkets.includes(r.market))
      return false;
    if (selectedRetailers.length && !selectedRetailers.includes(r.account))
      return false;
    if (selectedProducts.length && !selectedProducts.includes(r.product))
      return false;
    return true;
  });

  // Compute highlighted rows when hovering a cluster
  const highlightedRowIds = React.useMemo(() => {
    if (!hoverClusterId) return new Set<string>();
    return new Set<string>(
      rows.filter((r) => r.clusterId === hoverClusterId).map((r) => r.id),
    );
  }, [hoverClusterId, rows]);

  // Construct payload from cluster rows for editing
  const buildPayloadFromCluster = (clusterId: string): ClusterPayload => {
    const clusterRows = rows.filter((r) => r.clusterId === clusterId);
    if (clusterRows.length === 0) {
      return { market: '', account: '', products: [] };
    }
    const { market, account } = clusterRows[0];
    const productMap: Record<string, ProductEntry> = {};
    clusterRows.forEach((r) => {
      if (!productMap[r.product]) {
        productMap[r.product] = {
          name: r.product,
          nielsenTrend: (r as any).nielsenTrend,
          growthRate: (r as any).growthRate,
          scans: [],
        } as ProductEntry;
      }
      productMap[r.product].scans.push({
        week: r.week,
        scan: r.scanAmount,
        projectedScan: r.projectedScan,
        projectedRetail: r.projectedRetail,
        qd: r.qd,
        retailerMargin: r.retailerMargin,
        loyalty: r.loyalty,
      });
    });
    return {
      market,
      account,
      products: Object.values(productMap),
    };
  };

  const handleRowClick = (row: any) => {
    const clusterId = row.clusterId;
    const payload = buildPayloadFromCluster(clusterId);
    setEditingClusterId(clusterId);
    setEditingPayload(payload);
    const rowStatus = row.status as 'draft' | 'review' | 'approved';
    setSidebarStatus(rowStatus);
    const isReadOnly = !canEditCluster(role, mode, rowStatus);
    setSidebarReadOnly(isReadOnly);
    setSidebarOpen(true);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, position: 'relative' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 500,
              color: theme.palette.primary.main,
              mr: 1,
            }}
          >
            SCAN PLANNER
          </Typography>
          <Tooltip title={isCollapsed ? 'Expand' : 'Collapse'}>
            <IconButton onClick={() => setIsCollapsed((v) => !v)} size='small'>
              {isCollapsed ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowUpIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='contained'
            color='primary'
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingClusterId(null);
              setEditingPayload(null);
              setSidebarReadOnly(false);
              setSidebarStatus('draft');
              setSidebarOpen(true);
            }}
            sx={{ fontWeight: 500 }}
            disabled={isLocked || role === 'finance'}
          >
            Add Scan
          </Button>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<TableChartIcon />}
            onClick={() => setExportConfigDialogOpen(true)}
            sx={{ fontWeight: 500 }}
            disabled={role !== 'finance'}
          >
            Configure Excel Export
          </Button>
        </Box>
      </Box>

      {/* Filters always visible */}
      {!isCollapsed && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, width: '100%' }}>
          <Autocomplete
            multiple
            limitTags={2}
            options={marketOptions}
            value={selectedMarkets}
            onChange={(_e, v) => setSelectedMarkets(v)}
            renderInput={(params) => (
              <TextField {...params} label='Filter Markets' />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size='small' {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Autocomplete
            multiple
            limitTags={2}
            options={retailerOptions}
            value={selectedRetailers}
            onChange={(_e, v) => setSelectedRetailers(v)}
            renderInput={(params) => (
              <TextField {...params} label='Filter Retailers' />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size='small' {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Autocomplete
            multiple
            limitTags={2}
            options={productOptions}
            value={selectedProducts}
            onChange={(_e, v) => setSelectedProducts(v)}
            renderInput={(params) => (
              <TextField {...params} label='Filter Products' />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size='small' {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
        </Box>
      )}

      {/* Table */}
      {!isCollapsed && (
        <DynamicTable
          data={filteredRows}
          columns={columns}
          onRowHover={(row: any) => setHoverClusterId(row.clusterId)}
          onRowHoverEnd={() => setHoverClusterId(null)}
          stickyHeader
          enableColumnFiltering={false}
          maxHeight='calc(100vh - 300px)'
          defaultRowsPerPage={10}
          rowsPerPageOptions={[10, 25, 50]}
          expandedRowIds={highlightedRowIds}
          onRowClick={handleRowClick}
        />
      )}

      {/* Save/Publish Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button
          variant='contained'
          color='primary'
          onClick={() => console.log('Save clicked', rows)}
          disabled={hasReview || hasApproved}
        >
          <SaveIcon sx={{ mr: 1 }} />
          Save Progress
        </Button>
        {mode !== 'forecast' && (
          <Button
            variant='contained'
            color='secondary'
            onClick={() => {
              setPublishComment('');
              setPublishConfirmationText('');
              setPublishCommentError(false);
              setPublishConfirmationError(false);
              setPublishDialogOpen(true);
            }}
            disabled={hasApproved}
          >
            <PublishIcon sx={{ mr: 1 }} />
            Publish
          </Button>
        )}
      </Box>

      {/* Role Toggle Prototype */}
      <Box sx={{ position: 'absolute', bottom: 8, left: 16 }}>
        <Button
          variant='contained'
          color='primary'
          startIcon={<SwapHorizIcon />}
          onClick={() =>
            setRole((r) => (r === 'commercial' ? 'finance' : 'commercial'))
          }
        >
          {role === 'commercial'
            ? 'Switch to Finance View'
            : 'Switch to Commercial View'}
        </Button>
      </Box>

      {/* Sidebar */}
      <ScanSidebar
        open={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          setEditingClusterId(null);
          setEditingPayload(null);
        }}
        onAdd={handleSaveCluster}
        onDeleteCluster={(id) => dispatch(deleteClusterRows(id))}
        initialData={editingPayload || undefined}
        clusterId={editingClusterId || undefined}
        readOnly={sidebarReadOnly}
        status={sidebarStatus}
        role={role}
      />

      <Dialog
        open={publishDialogOpen}
        onClose={() => {
          if (isPublishing) return; // prevent close during publishing
          setPublishDialogOpen(false);
        }}
        maxWidth='sm'
        fullWidth
        disableEscapeKeyDown={isPublishing}
      >
        <DialogTitle color='primary'>Publish Scan Plan</DialogTitle>
        <DialogContent>
          <Typography variant='body1' gutterBottom>
            By selecting "Publish", you will finalize this scan plan. Please
            provide a comment and type "PUBLISH" below to confirm.
          </Typography>
          <TextField
            autoFocus
            required
            margin='dense'
            label='Comment (Required)'
            type='text'
            fullWidth
            variant='outlined'
            value={publishComment}
            onChange={(e) => {
              setPublishComment(e.target.value);
              if (e.target.value.trim()) setPublishCommentError(false);
            }}
            error={publishCommentError}
            helperText={publishCommentError ? 'Comment is required.' : ''}
            disabled={isPublishing}
            multiline
            rows={3}
          />
          <TextField
            required
            margin='dense'
            label="To publish, please type 'PUBLISH' and then select 'Publish'"
            type='text'
            fullWidth
            variant='outlined'
            value={publishConfirmationText}
            onChange={(e) => {
              const txt = e.target.value;
              setPublishConfirmationText(txt);
              if (txt === 'PUBLISH') {
                setPublishConfirmationError(false);
              } else if (txt.trim() !== '') {
                setPublishConfirmationError(true);
              } else {
                setPublishConfirmationError(false);
              }
            }}
            onBlur={() => {
              if (
                publishConfirmationText.trim() &&
                publishConfirmationText !== 'PUBLISH'
              ) {
                setPublishConfirmationError(true);
              }
            }}
            error={publishConfirmationError}
            helperText={
              publishConfirmationError
                ? 'Confirmation text does not match.'
                : ''
            }
            disabled={isPublishing}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (isPublishing) return;
              setPublishDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            color='secondary'
            onClick={() => {
              if (publishComment.trim() === '') {
                setPublishCommentError(true);
                return;
              }
              if (publishConfirmationText !== 'PUBLISH') {
                setPublishConfirmationError(true);
                return;
              }
              setIsPublishing(true);
              const nextStatus = rows.some((r) => r.status === 'review')
                ? 'approved'
                : 'review';
              setTimeout(() => {
                setIsPublishing(false);
                setPublishDialogOpen(false);
                showSnackbar(
                  nextStatus === 'approved'
                    ? 'Published to Approved'
                    : 'Submitted for Review',
                  'success',
                );
                dispatch(
                  setPlannerRows(
                    rows.map((r) => ({ ...r, status: nextStatus })),
                  ),
                );
              }, 1000);
            }}
            disabled={
              isPublishing ||
              publishComment.trim() === '' ||
              publishConfirmationText !== 'PUBLISH'
            }
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>

      {/* Export Configuration Dialog */}
      <FinanceExportConfigDialog
        open={exportConfigDialogOpen}
        onClose={() => setExportConfigDialogOpen(false)}
        onExport={handleExportConfig}
        markets={SCAN_MARKETS.map((m: any) => ({ id: m.name, name: m.name }))}
        retailers={retailerOptions.map((r: string) => ({ id: r, name: r }))}
      />
    </Paper>
  );
};

export default ScanPlanner;
