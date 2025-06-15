import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Collapse,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  TextField,
  DialogActions,
  Divider,
  Grid,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QualSidebar from "../reusableComponents/qualSidebar";
import TableChartIcon from "@mui/icons-material/TableChart";
import ExcelJS from "exceljs";
import Autocomplete from "@mui/material/Autocomplete";

interface Product {
  id: string;
  name: string;
  accountId: string;
}

interface ScanPlannerRow {
  id: string;
  accountId: string;
  productId: string;
  weekOf: Date;
  scanLevel1: number;
  qd: number;
  da: number;
  loyalty: number;
  retailMargin: number;
  bottleCostWithScan: number;
  supplierMarginDollars: number;
  supplierMarginPercent: number;
  projectedVolume: number;
  projectedScanSpend: number;
  status: "draft" | "pending" | "approved" | "rejected";
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  isManuallyModified?: boolean;
  modifiedBy?: string;
  modifiedAt?: Date;
  projectedRetail: number;
  promoSRP: number;
  promoMargin: number;
  loyaltyPerBottle: number;
  loyaltyOffer: string;
  comment: string;
  // Add missing properties for tracking actuals vs projections
  actualUnits: number;
  actualSpend: number;
  deltaUnits: number;
  deltaSpend: number;
}

interface Account {
  id: string;
  name: string;
  marketId: string;
  status: "draft" | "pending" | "approved" | "rejected";
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  isManuallyModified?: boolean;
  modifiedBy?: string;
  modifiedAt?: Date;
}

// Add Market interface
interface Market {
  id: string;
  name: string;
}

// Dummy markets
const dummyMarkets: Market[] = [
  { id: "ca", name: "California" },
  { id: "tx", name: "Texas" },
  { id: "ny", name: "New York" },
];

// Dummy accounts for testing (now with marketId)
const dummyAccounts: Account[] = [
  { id: "1", name: "Costco", marketId: "ca", status: "draft" },
  { id: "2", name: "Safeway", marketId: "ca", status: "draft" },
  { id: "3", name: "Costco", marketId: "tx", status: "draft" },
  { id: "4", name: "HEB", marketId: "tx", status: "draft" },
  { id: "5", name: "Wegmans", marketId: "ny", status: "draft" },
];

// Add dummy products data
const dummyProducts: Product[] = [
  { id: "1", name: "Product X", accountId: "1" },
  { id: "2", name: "Product Y", accountId: "1" },
  { id: "3", name: "Product Z", accountId: "2" },
  { id: "4", name: "Product W", accountId: "2" },
];

// Dummy data for testing
const dummyData: ScanPlannerRow[] = [
  {
    id: "1",
    accountId: "1",
    productId: "1",
    weekOf: new Date("2024-03-01"),
    scanLevel1: 15.99,
    qd: 1.0,
    da: 0.5,
    loyalty: 0.75,
    retailMargin: 15.8,
    bottleCostWithScan: 18.99,
    supplierMarginDollars: 3.0,
    supplierMarginPercent: 15.8,
    projectedVolume: 1000,
    projectedScanSpend: 15990,
    status: "pending",
    submittedBy: "John Sales",
    submittedAt: new Date("2024-03-15"),
    projectedRetail: 0,
    promoSRP: 0,
    promoMargin: 0,
    loyaltyPerBottle: 0,
    loyaltyOffer: "",
    comment: "",
    actualUnits: 950,
    actualSpend: 15200,
    deltaUnits: -50,
    deltaSpend: -790,
  },
  {
    id: "2",
    accountId: "1",
    productId: "2",
    weekOf: new Date("2024-03-08"),
    scanLevel1: 15.99,
    qd: 1.0,
    da: 0.5,
    loyalty: 0.75,
    retailMargin: 15.8,
    bottleCostWithScan: 18.99,
    supplierMarginDollars: 3.0,
    supplierMarginPercent: 15.8,
    projectedVolume: 1200,
    projectedScanSpend: 19188,
    status: "approved",
    submittedBy: "John Sales",
    submittedAt: new Date("2024-03-16"),
    approvedBy: "Sarah Finance",
    approvedAt: new Date("2024-03-17"),
    projectedRetail: 0,
    promoSRP: 0,
    promoMargin: 0,
    loyaltyPerBottle: 0,
    loyaltyOffer: "",
    comment: "",
    actualUnits: 1300,
    actualSpend: 20745,
    deltaUnits: 100,
    deltaSpend: 1557,
  },
  {
    id: "3",
    accountId: "2",
    productId: "3",
    weekOf: new Date("2024-03-01"),
    scanLevel1: 16.99,
    qd: 1.0,
    da: 0.5,
    loyalty: 0.75,
    retailMargin: 15.8,
    bottleCostWithScan: 19.99,
    supplierMarginDollars: 3.0,
    supplierMarginPercent: 15.8,
    projectedVolume: 800,
    projectedScanSpend: 13592,
    status: "draft",
    projectedRetail: 0,
    promoSRP: 0,
    promoMargin: 0,
    loyaltyPerBottle: 0,
    loyaltyOffer: "",
    comment: "",
    actualUnits: 750,
    actualSpend: 12743,
    deltaUnits: -50,
    deltaSpend: -849,
  },
];

// Function to generate PDF for calendar data
const generateCalendarPDF = (
  data: ScanPlannerRow[],
  selectedAccounts: string[],
  startDate: Date,
  endDate: Date
) => {
  const doc = new jsPDF();
  (doc as any).autoTable(); // Ensure autoTable is initialized

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;

  // Add title
  doc.setFontSize(20);
  doc.text("Scan Planner Calendar", margin, margin + 10);

  // Add date range
  doc.setFontSize(12);
  doc.text(
    `Period: ${format(startDate, "MMMM d, yyyy")} - ${format(
      endDate,
      "MMMM d, yyyy"
    )}`,
    margin,
    margin + 20
  );

  // Add selected accounts
  if (selectedAccounts.length > 0) {
    const accountNames = selectedAccounts
      .map((id) => dummyAccounts.find((acc) => acc.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    doc.text(`Accounts: ${accountNames}`, margin, margin + 30);
  }

  let currentDate = startOfMonth(startDate);
  let yPos = margin + 40;

  while (currentDate <= endDate) {
    // Create calendar grid for the month
    const days = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === days.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    // Draw calendar grid
    const cellWidth = contentWidth / 7;
    const cellHeight = 20;
    const startY = yPos;

    // Draw weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach((day, index) => {
      doc.text(day, margin + index * cellWidth, yPos);
    });
    yPos += 10;

    // Draw calendar grid
    weeks.forEach((week) => {
      week.forEach((day: Date, index: number) => {
        const x = margin + index * cellWidth;
        const y = yPos;

        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight);

        // Add date
        doc.text(format(day, "d"), x + 2, y + 7);

        // Check if there's data for this date
        const hasData = data.some((row) => {
          const rowDate = new Date(row.weekOf);
          return isSameDay(rowDate, day);
        });

        if (hasData) {
          // Add indicator dot
          doc.setFillColor(0, 0, 255); // Blue dot
          doc.circle(x + cellWidth - 5, y + 5, 2, "F");
        }
      });
      yPos += cellHeight;
    });

    // Add data summary for the month
    yPos += 10;
    doc.setFontSize(12);
    doc.text("Monthly Summary", margin, yPos);
    yPos += 10;

    // Filter data for this month
    const monthData = data.filter((row) => {
      const rowDate = new Date(row.weekOf);
      return isSameMonth(rowDate, currentDate);
    });

    // Create table data
    const tableData = monthData.map((row) => [
      format(new Date(row.weekOf), "MMM d, yyyy"),
      dummyAccounts.find((acc) => acc.id === row.accountId)?.name || "",
      row.projectedVolume.toLocaleString(),
      row.projectedScanSpend.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      }),
      row.actualUnits.toLocaleString(),
      row.actualSpend.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      }),
    ]);

    // Add table using the imported autoTable function
    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "Week Of",
          "Account",
          "Projected Volume",
          "Projected Spend",
          "Actual Units",
          "Actual Spend",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 0, 0] },
    });

    // Move to next month
    currentDate = addMonths(currentDate, 1);
    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Add new page if needed
    if (yPos > pageHeight - margin && currentDate <= endDate) {
      doc.addPage();
      yPos = margin + 40;
    }
  }

  // Save the PDF
  doc.save("scan_planner_calendar.pdf");
};

interface NewEntryFormData {
  weekOf: Date | null;
  projectedVolume: number;
  scanLevel1: number;
  projectedScanSpend: number;
  bottleCostWithScan: number;
  retailMargin: number;
  actualUnits: number;
  actualSpend: number;
}

// Add new interface for account status
interface AccountStatus {
  accountId: string;
  status: "draft" | "pending" | "approved" | "rejected";
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  isManuallyModified?: boolean;
  modifiedBy?: string;
  modifiedAt?: Date;
}

// Add new interface for market status
interface MarketStatus {
  marketId: string;
  status: "draft" | "pending" | "approved" | "rejected";
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  accountCount?: number;
  totalRows?: number;
}

// Add new interface for finance view tabs
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Add this helper function at the top level
const groupBy = <T,>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const ScanPlannerView: React.FC = () => {
  const theme = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [data, setData] = useState<ScanPlannerRow[]>(dummyData);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedRowForSidebar, setSelectedRowForSidebar] = useState<
    string | null
  >(null);
  const [selectedDataState, setSelectedDataState] =
    useState<ScanPlannerRow | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exportRangeType, setExportRangeType] = useState<"current" | "custom">(
    "current"
  );
  const [customExportRange, setCustomExportRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [userRole, setUserRole] = useState<"sales" | "finance">("sales"); // This would come from your auth system
  const [activeTab, setActiveTab] = useState<"draft" | "pending" | "approved">(
    "draft"
  );
  const [selectedPlan, setSelectedPlan] = useState<ScanPlannerRow | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [accountStatuses, setAccountStatuses] = useState<
    Record<string, AccountStatus>
  >({
    "1": { accountId: "1", status: "draft" },
    "2": { accountId: "2", status: "draft" },
    "3": { accountId: "3", status: "draft" },
  });
  const [marketStatuses, setMarketStatuses] = useState<
    Record<string, MarketStatus>
  >({
    ca: { marketId: "ca", status: "draft" },
    tx: { marketId: "tx", status: "draft" },
    ny: { marketId: "ny", status: "draft" },
  });
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [financeTabValue, setFinanceTabValue] = useState(0);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [expandedMarketAccounts, setExpandedMarketAccounts] = useState<
    Set<string>
  >(new Set());
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string>("");
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductAccountId, setNewProductAccountId] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [forecastModalOpen, setForecastModalOpen] = useState(true);
  const [forecastSelectedMarkets, setForecastSelectedMarkets] = useState<
    string[]
  >([]);
  const [forecastSelectedAccounts, setForecastSelectedAccounts] = useState<
    string[]
  >([]);
  const [forecastTabValue, setForecastTabValue] = useState(0);

  // --- Budget Management State ---
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [overallBudget, setOverallBudget] = useState<number | "">("");
  const [marketBudgets, setMarketBudgets] = useState<
    Record<string, number | "">
  >({});
  const [accountBudgets, setAccountBudgets] = useState<
    Record<string, number | "">
  >({});
  const [availableMarkets, setAvailableMarkets] = useState<Market[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set()
  );
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedMarketForAccounts, setSelectedMarketForAccounts] =
    useState<string>("");
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // --- Budget Management Handlers ---
  const handleBudgetChange = (
    level: "overall" | "market" | "account",
    key: string,
    value: string
  ) => {
    const num = value === "" ? "" : Number(value);
    if (level === "overall") setOverallBudget(num);
    if (level === "market")
      setMarketBudgets((prev) => ({ ...prev, [key]: num }));
    if (level === "account")
      setAccountBudgets((prev) => ({ ...prev, [key]: num }));
  };

  // --- Fetch Markets from API ---
  const fetchMarkets = async () => {
    setIsLoadingMarkets(true);
    try {
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${import.meta.env.VITE_API_URL}/markets`);
      // setAvailableMarkets(response.data);

      // For now, use dummy data but ready for API integration
      setAvailableMarkets(dummyMarkets);
    } catch (error) {
      console.error("Error fetching markets:", error);
      // Fallback to dummy data
      setAvailableMarkets(dummyMarkets);
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  // --- Fetch Accounts for Market from API ---
  const fetchAccountsForMarket = async (marketId: string) => {
    setIsLoadingAccounts(true);
    try {
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${import.meta.env.VITE_API_URL}/accounts?marketId=${marketId}`);
      // return response.data;

      // For now, use dummy data but ready for API integration
      return dummyAccounts.filter((acc) => acc.marketId === marketId);
    } catch (error) {
      console.error("Error fetching accounts for market:", error);
      // Fallback to dummy data
      return dummyAccounts.filter((acc) => acc.marketId === marketId);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // --- Add Market to Selection ---
  const handleAddMarket = (marketId: string) => {
    if (!selectedMarkets.includes(marketId)) {
      setSelectedMarkets((prev) => [...prev, marketId]);
    }
  };

  // --- Remove Market from Selection ---
  const handleRemoveMarket = (marketId: string) => {
    setSelectedMarkets((prev) => prev.filter((id) => id !== marketId));
    setMarketBudgets((prev) => {
      const updated = { ...prev };
      delete updated[marketId];
      return updated;
    });
    // Also remove any account budgets for this market
    setAccountBudgets((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith(`${marketId}_`)) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  // --- Toggle Market Expansion ---
  const handleToggleMarketExpansion = (marketId: string) => {
    setExpandedMarkets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
  };

  // --- Open Account Budget Modal ---
  const handleOpenAccountBudgets = async (marketId: string) => {
    setSelectedMarketForAccounts(marketId);
    const accounts = await fetchAccountsForMarket(marketId);
    setAvailableAccounts(accounts);
    setAccountModalOpen(true);
  };

  // --- Initialize markets on component mount ---
  useEffect(() => {
    fetchMarkets();
  }, []);

  // --- Budgeted Markets/Accounts for Filtering ---
  const budgetedMarkets = Object.keys(marketBudgets).filter(
    (k) => marketBudgets[k] !== "" && !isNaN(Number(marketBudgets[k]))
  );
  const budgetedAccounts = Object.keys(accountBudgets).filter(
    (k) => accountBudgets[k] !== "" && !isNaN(Number(accountBudgets[k]))
  );

  // --- Filtered Markets/Accounts for Sales Modal ---
  const forecastBudgetMarkets =
    budgetedMarkets.length > 0
      ? dummyMarkets.filter((m) => budgetedMarkets.includes(m.id))
      : overallBudget
      ? dummyMarkets
      : [];
  const forecastBudgetAccounts =
    budgetedAccounts.length > 0
      ? dummyAccounts.filter((a) =>
          budgetedAccounts.includes(`${a.marketId}_${a.id}`)
        )
      : budgetedMarkets.length > 0
      ? dummyAccounts.filter((a) => budgetedMarkets.includes(a.marketId))
      : overallBudget
      ? dummyAccounts
      : [];

  // --- Get Budget for Selected Market/Account ---
  const getBudgetForSelection = () => {
    if (forecastSelectedAccounts.length === 1) {
      const accKey = `${
        forecastFilteredAccounts.find(
          (a) => a.id === forecastSelectedAccounts[0]
        )?.marketId
      }_${forecastSelectedAccounts[0]}`;
      if (accountBudgets[accKey]) return accountBudgets[accKey];
    }
    if (
      forecastSelectedMarkets.length === 1 &&
      marketBudgets[forecastSelectedMarkets[0]]
    ) {
      return marketBudgets[forecastSelectedMarkets[0]];
    }
    return overallBudget;
  };

  // --- Budget Management Modal UI ---
  const renderBudgetManagementModal = () => (
    <Dialog
      open={budgetModalOpen}
      onClose={() => setBudgetModalOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalanceIcon color="primary" />
          Budget Management
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Overall Budget Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Overall Budget
          </Typography>
          <TextField
            label="Overall Budget ($)"
            type="number"
            value={overallBudget}
            onChange={(e) => handleBudgetChange("overall", "", e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Market Selection Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Market Selection
          </Typography>
          <Box sx={{ mb: 2 }}>
            {isLoadingMarkets ? (
              <CircularProgress size={24} />
            ) : (
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Add Market</InputLabel>
                <Select
                  value=""
                  onChange={(e) => handleAddMarket(e.target.value)}
                  input={<OutlinedInput label="Add Market" />}
                >
                  {availableMarkets
                    .filter((market) => !selectedMarkets.includes(market.id))
                    .map((market) => (
                      <MenuItem key={market.id} value={market.id}>
                        {market.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Selected Markets with Budgets */}
          {selectedMarkets.map((marketId) => {
            const market = availableMarkets.find((m) => m.id === marketId);
            if (!market) return null;

            return (
              <Accordion
                key={marketId}
                expanded={expandedMarkets.has(marketId)}
                onChange={() => handleToggleMarketExpansion(marketId)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ flex: 1 }}>
                      {market.name}
                      {marketBudgets[marketId] && (
                        <Chip
                          label={`$${Number(
                            marketBudgets[marketId]
                          ).toLocaleString()}`}
                          size="small"
                          color="primary"
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMarket(marketId);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {/* Market Budget Input */}
                    <TextField
                      label={`${market.name} Budget ($)`}
                      type="number"
                      value={marketBudgets[marketId] ?? ""}
                      onChange={(e) =>
                        handleBudgetChange("market", marketId, e.target.value)
                      }
                      sx={{ width: 250 }}
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>$</Typography>
                        ),
                      }}
                    />

                    {/* Add Account Budgets Button */}
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenAccountBudgets(marketId)}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Add Account Budgets
                    </Button>

                    {/* Show existing account budgets for this market */}
                    {Object.entries(accountBudgets)
                      .filter(([key]) => key.startsWith(`${marketId}_`))
                      .map(([key, value]) => {
                        const accountId = key.split("_")[1];
                        const account = dummyAccounts.find(
                          (a) => a.id === accountId
                        );
                        return account ? (
                          <Box
                            key={key}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <TextField
                              label={`${account.name} Budget ($)`}
                              type="number"
                              value={value ?? ""}
                              onChange={(e) =>
                                handleBudgetChange(
                                  "account",
                                  key,
                                  e.target.value
                                )
                              }
                              sx={{ width: 200 }}
                              size="small"
                              InputProps={{
                                startAdornment: (
                                  <Typography sx={{ mr: 1 }}>$</Typography>
                                ),
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                setAccountBudgets((prev) => {
                                  const updated = { ...prev };
                                  delete updated[key];
                                  return updated;
                                });
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        ) : null;
                      })}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Budget Summary */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Budget Summary
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f0fa" }}>
                  <th
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    Level
                  </th>
                  <th
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: 8,
                      textAlign: "right",
                    }}
                  >
                    Budget ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                    Overall
                  </td>
                  <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                    All Markets
                  </td>
                  <td
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: 8,
                      textAlign: "right",
                    }}
                  >
                    {overallBudget
                      ? `$${Number(overallBudget).toLocaleString()}`
                      : "-"}
                  </td>
                </tr>
                {selectedMarkets.map((marketId) => {
                  const market = availableMarkets.find(
                    (m) => m.id === marketId
                  );
                  return market ? (
                    <tr key={marketId}>
                      <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                        Market
                      </td>
                      <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                        {market.name}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e0e0e0",
                          padding: 8,
                          textAlign: "right",
                        }}
                      >
                        {marketBudgets[marketId]
                          ? `$${Number(
                              marketBudgets[marketId]
                            ).toLocaleString()}`
                          : "-"}
                      </td>
                    </tr>
                  ) : null;
                })}
                {Object.entries(accountBudgets).map(([key, value]) => {
                  const [marketId, accountId] = key.split("_");
                  const market = availableMarkets.find(
                    (m) => m.id === marketId
                  );
                  const account = dummyAccounts.find((a) => a.id === accountId);
                  return market && account ? (
                    <tr key={key}>
                      <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                        Account
                      </td>
                      <td style={{ border: "1px solid #e0e0e0", padding: 8 }}>
                        {market.name} - {account.name}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e0e0e0",
                          padding: 8,
                          textAlign: "right",
                        }}
                      >
                        {value ? `$${Number(value).toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBudgetModalOpen(false)}>Close</Button>
        <Button variant="contained" onClick={() => setBudgetModalOpen(false)}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );

  // --- Account Budget Modal ---
  const renderAccountBudgetModal = () => (
    <Dialog
      open={accountModalOpen}
      onClose={() => setAccountModalOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Add Account Budgets -{" "}
        {availableMarkets.find((m) => m.id === selectedMarketForAccounts)?.name}
      </DialogTitle>
      <DialogContent>
        {isLoadingAccounts ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set specific budgets for accounts in this market. If no account
              budget is set, the market-level budget will be used.
            </Typography>
            <List>
              {availableAccounts.map((account) => {
                const accountKey = `${selectedMarketForAccounts}_${account.id}`;
                return (
                  <ListItem key={account.id} divider>
                    <ListItemText
                      primary={account.name}
                      secondary={`Account ID: ${account.id}`}
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        label="Budget ($)"
                        type="number"
                        value={accountBudgets[accountKey] ?? ""}
                        onChange={(e) =>
                          handleBudgetChange(
                            "account",
                            accountKey,
                            e.target.value
                          )
                        }
                        sx={{ width: 150 }}
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1 }}>$</Typography>
                          ),
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAccountModalOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={() => setAccountModalOpen(false)}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Update the filtered data to consider account selection
  const filteredData = selectedAccount
    ? data.filter((row) => row.accountId === selectedAccount)
    : [];

  // Group data by product
  const groupedData = filteredData.reduce((acc, row) => {
    const productId = row.productId;
    if (!acc[productId]) {
      acc[productId] = [];
    }
    acc[productId].push(row);
    return acc;
  }, {} as Record<string, ScanPlannerRow[]>);

  // Function to check if a date has data
  const hasDataForDate = (date: Date) => {
    return filteredData.some((row) => {
      const rowDate = new Date(row.weekOf);
      return isSameDay(rowDate, date);
    });
  };

  // Function to get data for a specific date
  const getDataForDate = (date: Date) => {
    return filteredData.find((row) => {
      const rowDate = new Date(row.weekOf);
      return isSameDay(rowDate, date);
    });
  };

  // Function to handle PDF export
  const handleExportPDF = () => {
    let startDate: Date;
    let endDate: Date;

    if (exportRangeType === "current") {
      startDate = startOfMonth(currentMonth);
      endDate = endOfMonth(currentMonth);
    } else {
      if (!customExportRange.start || !customExportRange.end) {
        // Handle case where custom range is not fully selected
        console.error("Custom date range not fully selected.");
        return;
      }
      startDate = customExportRange.start;
      endDate = customExportRange.end;
    }

    // Filter data again based on the selected export date range
    const dataToExport = filteredData.filter((row) => {
      const rowDate = new Date(row.weekOf);
      return (
        rowDate >= startOfMonth(startDate) && rowDate <= endOfMonth(endDate)
      );
    });

    generateCalendarPDF(dataToExport, selectedAccounts, startDate, endDate);
  };

  // Custom day renderer for the calendar
  const CustomDay = (props: any) => {
    const { day, ...other } = props;
    const hasData = hasDataForDate(day);
    return (
      <Box
        sx={{
          position: "relative",
          "&::after": hasData
            ? {
                content: '""',
                position: "absolute",
                bottom: 2,
                left: "50%",
                transform: "translateX(-50%)",
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: theme.palette.primary.main,
              }
            : {},
        }}
      >
        <PickersDay {...other} day={day} />
      </Box>
    );
  };

  // Function to get available months/years for custom range dropdowns
  const getAvailableMonths = () => {
    const months: { value: string; label: string }[] = [];
    const startYear = new Date().getFullYear() - 5; // 5 years back
    const endYear = new Date().getFullYear() + 5; // 5 years forward

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        months.push({
          value: format(date, "yyyy-MM"),
          label: format(date, "MMMM yyyy"),
        });
      }
    }
    return months;
  };

  const availableMonths = getAvailableMonths();

  // Update the calendar dialog content
  const renderCalendarContent = () => {
    return (
      <Box sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <IconButton
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <KeyboardArrowUpIcon />
            </IconButton>
            <Typography variant="h6">
              {format(currentMonth, "MMMM yyyy")}
            </Typography>
            <IconButton
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </Box>
          <DateCalendar
            value={selectedDate}
            onChange={(newDate) => setSelectedDate(newDate)}
            sx={{
              "& .MuiPickersDay-root.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              },
              "& .MuiPickersDay-root.Mui-selected:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
            slots={{
              day: CustomDay,
            }}
          />
        </Box>
        {selectedDate && (
          <Box sx={{ flex: 1, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data for {format(selectedDate, "MMMM d, yyyy")}
            </Typography>
            {getDataForDate(selectedDate) ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Account:{" "}
                  {
                    dummyAccounts.find(
                      (acc) =>
                        acc.id === getDataForDate(selectedDate)?.accountId
                    )?.name
                  }
                </Typography>
                <Typography variant="body1">
                  Projected Volume:{" "}
                  {getDataForDate(
                    selectedDate
                  )?.projectedVolume.toLocaleString()}
                </Typography>
                <Typography variant="body1">
                  Projected Spend:{" "}
                  {getDataForDate(
                    selectedDate
                  )?.projectedScanSpend.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </Typography>
                <Typography variant="body1">
                  Actual Units:{" "}
                  {getDataForDate(selectedDate)?.actualUnits.toLocaleString()}
                </Typography>
                <Typography variant="body1">
                  Actual Spend:{" "}
                  {getDataForDate(selectedDate)?.actualSpend.toLocaleString(
                    undefined,
                    {
                      style: "currency",
                      currency: "USD",
                    }
                  )}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No data available for this date
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const handleRowClick = (row: ScanPlannerRow) => {
    if (!selectedAccount) return;

    // If this is a new entry (id starts with 'new-')
    if (row.id.startsWith("new-")) {
      const newRow: ScanPlannerRow = {
        ...row,
        id: `row-${Date.now()}`, // Generate a unique ID
        status: "draft",
        isManuallyModified: true,
        modifiedBy: "Current User", // Replace with actual user
        modifiedAt: new Date(),
        projectedRetail: 0,
        promoSRP: 0,
        promoMargin: 0,
        loyaltyPerBottle: 0,
        loyaltyOffer: "",
        comment: "",
      };

      // Add the new row to the data
      setData((prevData) => [...prevData, newRow]);

      // Update account status to reflect manual modification
      setAccountStatuses((prev) => ({
        ...prev,
        [selectedAccount]: {
          ...prev[selectedAccount],
          isManuallyModified: true,
        },
      }));
    }

    setSelectedRowForSidebar(row.id);
    setSelectedDataState(row);
    setHasChanges(false);
  };

  const handleSidebarSave = () => {
    if (!selectedDataState) return;

    const updatedRow = {
      ...selectedDataState,
      isManuallyModified: true,
      modifiedBy: "Current User", // Replace with actual user
      modifiedAt: new Date(),
    };

    setData((prevData) =>
      prevData.map((row) => (row.id === updatedRow.id ? updatedRow : row))
    );

    // Update account status to reflect manual modification
    setAccountStatuses((prev) => ({
      ...prev,
      [selectedDataState.accountId]: {
        ...prev[selectedDataState.accountId],
        isManuallyModified: true,
      },
    }));

    setSelectedRowForSidebar(null);
    setSelectedDataState(null);
    setHasChanges(false);
  };

  const handleFieldChange = (field: keyof ScanPlannerRow, value: any) => {
    if (!selectedDataState) return;

    setSelectedDataState((prev) => {
      if (!prev) return null;

      const updated = {
        ...prev,
        [field]: value,
        isManuallyModified: true,
      };

      // Recalculate deltas if needed
      if (field === "actualUnits" || field === "projectedVolume") {
        updated.deltaUnits = updated.actualUnits - updated.projectedVolume;
      }
      if (field === "actualSpend" || field === "projectedScanSpend") {
        updated.deltaSpend = updated.actualSpend - updated.projectedScanSpend;
      }

      return updated;
    });

    setHasChanges(true);
  };

  const columns: Column[] = [
    // Basic Information Group
    {
      key: "basic_info",
      header: "Basic Information",
      columnGroup: true,
      columns: [
        {
          key: "weekOf",
          header: "Week Of",
          align: "left" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.weekOf.getTime(),
          render: (value: Date, row: ScanPlannerRow) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {value.toLocaleDateString()}
              </Typography>
              {row.isManuallyModified && (
                <Tooltip
                  title={`Modified by ${
                    row.modifiedBy
                  } on ${row.modifiedAt?.toLocaleDateString()}`}
                >
                  <EditIcon fontSize="small" color="primary" />
                </Tooltip>
              )}
            </Box>
          ),
        },
      ],
    },

    // Scan Details Group
    {
      key: "scan_details",
      header: "Scan Details",
      columnGroup: true,
      columns: [
        {
          key: "scanLevel1",
          header: "Scan Amount",
          subHeader: "Base scan value",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.scanLevel1,
          render: (value: number) => (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
        {
          key: "qd",
          header: "QD",
          subHeader: "Quantity discount",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.qd,
          render: (value: number) => (
            <Typography
              variant="body2"
              color={value > 0 ? "success.main" : "text.primary"}
            >
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
        {
          key: "da",
          header: "DA",
          subHeader: "Display allowance",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.da,
          render: (value: number) => (
            <Typography
              variant="body2"
              color={value > 0 ? "success.main" : "text.primary"}
            >
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
        {
          key: "loyalty",
          header: "Loyalty",
          subHeader: "Loyalty program",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.loyalty,
          render: (value: number) => (
            <Typography
              variant="body2"
              color={value > 0 ? "warning.main" : "text.primary"}
            >
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
      ],
    },

    // Pricing & Margins Group
    {
      key: "pricing_margins",
      header: "Pricing & Margins",
      columnGroup: true,
      columns: [
        {
          key: "retailMargin",
          header: "Retail Margin",
          subHeader: "%",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.retailMargin,
          render: (value: number) => (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color:
                  value >= 15
                    ? "success.main"
                    : value >= 10
                    ? "warning.main"
                    : "error.main",
              }}
            >
              {value.toFixed(2)}%
            </Typography>
          ),
        },
        {
          key: "bottleCostWithScan",
          header: "Projected Retail",
          subHeader: "Per unit",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.bottleCostWithScan,
          render: (value: number) => (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
        {
          key: "supplierMarginDollars",
          header: "Supplier Margin",
          subHeader: "$",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.supplierMarginDollars,
          render: (value: number) => (
            <Typography variant="body2" color="primary.main">
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
        {
          key: "supplierMarginPercent",
          header: "Supplier Margin",
          subHeader: "%",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.supplierMarginPercent,
          render: (value: number) => (
            <Typography
              variant="body2"
              sx={{
                color:
                  value >= 15
                    ? "success.main"
                    : value >= 10
                    ? "warning.main"
                    : "error.main",
              }}
            >
              {value.toFixed(2)}%
            </Typography>
          ),
        },
      ],
    },

    // Projections Group
    {
      key: "projections",
      header: "Projections",
      columnGroup: true,
      columns: [
        {
          key: "projectedVolume",
          header: "Volume",
          subHeader: "Units",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.projectedVolume,
          render: (value: number) => (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {value.toLocaleString()}
            </Typography>
          ),
        },
        {
          key: "projectedScanSpend",
          header: "Scan Spend",
          subHeader: "Total cost",
          align: "right" as const,
          sortable: true,
          filterable: true,
          sortAccessor: (row: ScanPlannerRow) => row.projectedScanSpend,
          render: (value: number) => (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {value.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}
            </Typography>
          ),
        },
      ],
    },
  ];

  // Update the filtered data to consider account status
  const filteredDataByRole = data.filter((row) => {
    const accountStatus = accountStatuses[row.accountId];
    if (!accountStatus) return true;

    if (userRole === "sales") {
      switch (activeTab) {
        case "draft":
          return accountStatus.status === "draft";
        case "pending":
          return accountStatus.status === "pending";
        case "approved":
          return (
            accountStatus.status === "approved" ||
            accountStatus.status === "rejected"
          );
        default:
          return true;
      }
    } else {
      // Finance view
      switch (activeTab) {
        case "pending":
          return accountStatus.status === "pending";
        case "approved":
          return accountStatus.status === "approved";
        default:
          return true;
      }
    }
  });

  const handleSubmitForApproval = (accountId: string) => {
    setAccountStatuses((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        status: "pending",
        submittedBy: "Current User", // Replace with actual user
        submittedAt: new Date(),
        isManuallyModified: false, // Reset isManuallyModified when submitting
      },
    }));
  };

  const handleSubmitMarketForApproval = (marketId: string) => {
    // Get all accounts in this market
    const accountsInMarket = dummyAccounts.filter(
      (acc) => acc.marketId === marketId
    );
    const accountCount = accountsInMarket.length;
    const totalRows = data.filter((row) =>
      accountsInMarket.some((acc) => acc.id === row.accountId)
    ).length;

    // Update market status
    setMarketStatuses((prev) => ({
      ...prev,
      [marketId]: {
        ...prev[marketId],
        status: "pending",
        submittedBy: "Current User", // Replace with actual user
        submittedAt: new Date(),
        accountCount,
        totalRows,
      },
    }));

    // Update all account statuses in this market to pending
    const updatedAccountStatuses: Record<string, AccountStatus> = {};
    accountsInMarket.forEach((account) => {
      updatedAccountStatuses[account.id] = {
        accountId: account.id,
        status: "pending",
        submittedBy: "Current User",
        submittedAt: new Date(),
        isManuallyModified: false,
      };
    });

    setAccountStatuses((prev) => ({
      ...prev,
      ...updatedAccountStatuses,
    }));
  };

  const handleApprove = (accountId: string) => {
    setAccountStatuses((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        status: "approved",
        approvedBy: "Current User", // Replace with actual user
        approvedAt: new Date(),
        comments: approvalComments,
      },
    }));
    setSelectedPlan(null);
    setApprovalComments("");
  };

  const handleReject = (accountId: string) => {
    setAccountStatuses((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        status: "rejected",
        approvedBy: "Current User", // Replace with actual user
        approvedAt: new Date(),
        comments: approvalComments,
      },
    }));
    setSelectedPlan(null);
    setApprovalComments("");
  };

  const handleApproveMarket = (marketId: string) => {
    // Get all accounts in this market
    const accountsInMarket = dummyAccounts.filter(
      (acc) => acc.marketId === marketId
    );

    // Update market status
    setMarketStatuses((prev) => ({
      ...prev,
      [marketId]: {
        ...prev[marketId],
        status: "approved",
        approvedBy: "Current User", // Replace with actual user
        approvedAt: new Date(),
        comments: approvalComments,
      },
    }));

    // Update all account statuses in this market to approved
    const updatedAccountStatuses: Record<string, AccountStatus> = {};
    accountsInMarket.forEach((account) => {
      updatedAccountStatuses[account.id] = {
        ...accountStatuses[account.id],
        status: "approved",
        approvedBy: "Current User",
        approvedAt: new Date(),
        comments: approvalComments,
      };
    });

    setAccountStatuses((prev) => ({
      ...prev,
      ...updatedAccountStatuses,
    }));

    setSelectedPlan(null);
    setApprovalComments("");
  };

  const handleRejectMarket = (marketId: string) => {
    // Get all accounts in this market
    const accountsInMarket = dummyAccounts.filter(
      (acc) => acc.marketId === marketId
    );

    // Update market status
    setMarketStatuses((prev) => ({
      ...prev,
      [marketId]: {
        ...prev[marketId],
        status: "rejected",
        approvedBy: "Current User", // Replace with actual user
        approvedAt: new Date(),
        comments: approvalComments,
      },
    }));

    // Update all account statuses in this market to rejected
    const updatedAccountStatuses: Record<string, AccountStatus> = {};
    accountsInMarket.forEach((account) => {
      updatedAccountStatuses[account.id] = {
        ...accountStatuses[account.id],
        status: "rejected",
        approvedBy: "Current User",
        approvedAt: new Date(),
        comments: approvalComments,
      };
    });

    setAccountStatuses((prev) => ({
      ...prev,
      ...updatedAccountStatuses,
    }));

    setSelectedPlan(null);
    setApprovalComments("");
  };

  // Add new handler function after handleReject
  const handleCancelSubmission = (accountId: string) => {
    setAccountStatuses((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        status: "draft",
        submittedBy: undefined,
        submittedAt: undefined,
      },
    }));
  };

  // Move exportTableToPDF inside the component to access accountStatuses
  const exportTableToPDF = (
    accountId: string,
    accountData: ScanPlannerRow[]
  ) => {
    const doc = new jsPDF();
    const accountName =
      dummyAccounts.find((acc) => acc.id === accountId)?.name ||
      "Unknown Account";

    // Add title
    doc.setFontSize(16);
    doc.text(`Scan Planner - ${accountName}`, 14, 20);

    // Add approval details
    doc.setFontSize(10);
    const approvalDetails = accountStatuses[accountId];
    if (approvalDetails?.approvedBy) {
      doc.text(`Approved by: ${approvalDetails.approvedBy}`, 14, 30);
      doc.text(
        `Approved on: ${approvalDetails.approvedAt?.toLocaleDateString()}`,
        14,
        35
      );
    }

    // Group data by product
    const productGroups = accountData.reduce((acc, row) => {
      if (!acc[row.productId]) {
        acc[row.productId] = [];
      }
      acc[row.productId].push(row);
      return acc;
    }, {} as Record<string, ScanPlannerRow[]>);

    let yPos = 40;

    // Add each product's data
    Object.entries(productGroups).forEach(([productId, productData]) => {
      const productName =
        dummyProducts.find((prod) => prod.id === productId)?.name ||
        "Unknown Product";

      // Add product name
      doc.setFontSize(12);
      doc.text(productName, 14, yPos);
      yPos += 10;

      // Prepare table data
      const tableData = productData.map((row) => [
        row.weekOf.toLocaleDateString(),
        row.scanLevel1.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        row.qd.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        row.da.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        row.loyalty.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        `${row.retailMargin.toFixed(2)}%`,
        row.bottleCostWithScan.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        row.supplierMarginDollars.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
        `${row.supplierMarginPercent.toFixed(2)}%`,
        row.projectedVolume.toLocaleString(),
        row.projectedScanSpend.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: yPos,
        head: [
          [
            "Week Of",
            "Scan Amount",
            "QD",
            "DA",
            "Loyalty",
            "Retail Margin (%)",
            "Projected Retail",
            "Supplier Margin ($)",
            "Supplier Margin (%)",
            "Projected Volume",
            "Projected Scan Spend",
          ],
        ],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 0] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;

      // Add new page if needed
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Save the PDF
    doc.save(`scan_planner_${accountName.replace(/\s+/g, "_")}.pdf`);
  };

  const handleCommentClick = (comments: string) => {
    setSelectedComment(comments);
    setCommentDialogOpen(true);
  };

  // Add handlers for adding account/product
  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newId = (dummyAccounts.length + 1).toString();
    dummyAccounts.push({
      id: newId,
      name: newAccountName,
      marketId: selectedMarket,
      status: "draft",
    });
    setAccountStatuses((prev) => ({
      ...prev,
      [newId]: { accountId: newId, status: "draft" },
    }));
    setNewAccountName("");
    setAddAccountDialogOpen(false);
    setSelectedAccount(newId);
  };

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductAccountId) return;
    const newId = (dummyProducts.length + 1).toString();
    dummyProducts.push({
      id: newId,
      name: newProductName,
      accountId: newProductAccountId,
    });

    // Create an empty row for the new product
    const newRow: ScanPlannerRow = {
      id: `new-${Date.now()}`,
      accountId: newProductAccountId,
      productId: newId,
      weekOf: new Date(),
      scanLevel1: 0,
      qd: 0,
      da: 0,
      loyalty: 0,
      retailMargin: 0,
      bottleCostWithScan: 0,
      supplierMarginDollars: 0,
      supplierMarginPercent: 0,
      projectedVolume: 0,
      projectedScanSpend: 0,
      status: "draft",
      projectedRetail: 0,
      promoSRP: 0,
      promoMargin: 0,
      loyaltyPerBottle: 0,
      loyaltyOffer: "",
      comment: "",
      actualUnits: 0,
      actualSpend: 0,
      deltaUnits: 0,
      deltaSpend: 0,
    };

    setData((prev) => [...prev, newRow]);
    setNewProductName("");
    setNewProductAccountId("");
    setAddProductDialogOpen(false);
  };

  // Market-level PDF export
  const exportMarketToPDF = (
    marketId: string,
    marketData: ScanPlannerRow[],
    accountsInMarket: Account[]
  ) => {
    const market = dummyMarkets.find((m) => m.id === marketId);
    const marketName = market?.name || "Unknown Market";

    const doc = new jsPDF();
    (doc as any).autoTable(); // Ensure autoTable is initialized

    // Add title
    doc.setFontSize(16);
    doc.text(`Scan Planner - ${marketName} Market`, 14, 20);

    // Add market approval details
    doc.setFontSize(10);
    const marketStatus = marketStatuses[marketId];
    if (marketStatus?.approvedBy) {
      doc.text(`Approved by: ${marketStatus.approvedBy}`, 14, 30);
      doc.text(
        `Approved on: ${marketStatus.approvedAt?.toLocaleDateString()}`,
        14,
        35
      );
      doc.text(`Accounts: ${accountsInMarket.length}`, 14, 40);
      doc.text(`Total entries: ${marketData.length}`, 14, 45);
    }

    let yPos = 55;

    // Export each account's data
    accountsInMarket.forEach((account) => {
      const accountData = marketData.filter(
        (row) => row.accountId === account.id
      );
      if (accountData.length === 0) return;

      // Add account header
      doc.setFontSize(14);
      doc.text(`Account: ${account.name}`, 14, yPos);
      yPos += 10;

      // Group by product
      const productGroups = accountData.reduce((acc, row) => {
        if (!acc[row.productId]) {
          acc[row.productId] = [];
        }
        acc[row.productId].push(row);
        return acc;
      }, {} as Record<string, ScanPlannerRow[]>);

      Object.entries(productGroups).forEach(([productId, productData]) => {
        const productName =
          dummyProducts.find((prod) => prod.id === productId)?.name ||
          "Unknown Product";

        // Add product name
        doc.setFontSize(12);
        doc.text(`  ${productName}`, 14, yPos);
        yPos += 10;

        // Create table data
        const tableData = productData.map((row) => [
          format(new Date(row.weekOf), "MMM d, yyyy"),
          row.scanLevel1.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          }),
          row.projectedVolume.toLocaleString(),
          row.projectedScanSpend.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          }),
        ]);

        // Add table
        autoTable(doc, {
          startY: yPos,
          head: [["Week Of", "Scan Amount", "Volume", "Scan Spend"]],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 0, 0] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Add new page if needed
        if (yPos > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 10; // Space between accounts
    });

    // Save the PDF
    doc.save(`scan_planner_${marketName.replace(/\s+/g, "_")}_market.pdf`);
  };

  // Market-level Excel export with separate sheets for each account
  const exportMarketToExcel = async (
    marketId: string,
    marketData: ScanPlannerRow[],
    accountsInMarket: Account[]
  ) => {
    const market = dummyMarkets.find((m) => m.id === marketId);
    const marketName = market?.name || "Unknown Market";

    const workbook = new ExcelJS.Workbook();

    // Month columns: JAN-DEC
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];

    // Create a sheet for each account
    for (const account of accountsInMarket) {
      const accountData = marketData.filter(
        (row) => row.accountId === account.id
      );
      if (accountData.length === 0) continue;

      const productGroups = groupBy(accountData, "productId");
      const ws = workbook.addWorksheet(
        account.name.replace(/[^a-zA-Z0-9]/g, "_")
      );

      // 1. Title row with market and account info
      const titleRow = ws.addRow([
        `${marketName} Market - ${
          account.name
        } - ${new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "2-digit",
        })}`,
      ]);
      titleRow.font = { bold: true, size: 14, color: { argb: "FF000000" } };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(1, 1, 1, 1 + monthNames.length);

      // Add blank row
      ws.addRow([]);

      // Define section rows with colors
      const sectionRows = [
        {
          label: "BOTTLE COST",
          key: "bottleCostWithScan",
          type: "currency",
          bgColor: "FFF0F0F0",
        },
        {
          label: "FRONTLINE SRP",
          key: "projectedRetail",
          type: "currency",
          bgColor: "FFF0F0F0",
        },
        {
          label: "FRONTLINE MARGIN %",
          key: "retailMargin",
          type: "percent",
          bgColor: "FFF0F0F0",
        },
        {
          label: "SCAN",
          key: "scanLevel1",
          type: "currency",
          bgColor: "FF87CEEB",
        },
        {
          label: "PROMO SRP",
          key: "promoSRP",
          type: "currency",
          bgColor: "FF87CEEB",
        },
        {
          label: "PROMO MARGIN %",
          key: "promoMargin",
          type: "percent",
          bgColor: "FF87CEEB",
        },
        {
          label: "LOYALTY PER BOTTLE",
          key: "loyaltyPerBottle",
          type: "currency",
          bgColor: "FFDA70D6",
        },
        {
          label: "LOYALTY OFFER",
          key: "loyaltyOffer",
          type: "text",
          bgColor: "FFDA70D6",
        },
        {
          label: "COMMENT",
          key: "comment",
          type: "text",
          bgColor: "FFDA70D6",
        },
      ];

      // Loop through each product and add its section
      const productEntries = Object.entries(productGroups);
      for (
        let productIndex = 0;
        productIndex < productEntries.length;
        productIndex++
      ) {
        const [productId, productData] = productEntries[productIndex];
        const productName =
          dummyProducts.find((p) => p.id === productId)?.name ||
          "Unknown Product";

        // Map months to data
        const monthMap: Record<string, ScanPlannerRow | undefined> = {};
        for (const row of productData) {
          const m = new Date(row.weekOf)
            .toLocaleString("default", { month: "short" })
            .toUpperCase();
          monthMap[m] = row;
        }

        // Add spacing between products (except for the first one)
        if (productIndex > 0) {
          ws.addRow([]);
        }

        // Product header row
        const productHeaderRow = ws.addRow([
          productName.toUpperCase(),
          ...monthNames,
        ]);
        productHeaderRow.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
          size: 11,
        };
        productHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF333333" },
        };
        productHeaderRow.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        // Add borders to header
        for (let i = 1; i <= 1 + monthNames.length; i++) {
          productHeaderRow.getCell(i).border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }

        // Create data rows for this product
        for (const rowDef of sectionRows) {
          const rowValues = [rowDef.label];

          for (const monthName of monthNames) {
            const data = monthMap[monthName];
            if (!data) {
              rowValues.push("");
            } else {
              const fieldValue = (data as any)[rowDef.key];
              if (rowDef.type === "currency") {
                rowValues.push(
                  typeof fieldValue === "number" && fieldValue !== 0
                    ? fieldValue.toString()
                    : ""
                );
              } else if (rowDef.type === "percent") {
                rowValues.push(
                  typeof fieldValue === "number" && fieldValue !== 0
                    ? (fieldValue / 100).toString()
                    : ""
                );
              } else {
                rowValues.push(
                  fieldValue !== undefined && fieldValue !== ""
                    ? fieldValue
                    : ""
                );
              }
            }
          }

          const dataRow = ws.addRow(rowValues);

          // Style the label column
          dataRow.getCell(1).font = {
            bold: true,
            size: 10,
            color: { argb: "FF000000" },
          };
          dataRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rowDef.bgColor },
          };
          dataRow.getCell(1).alignment = {
            horizontal: "left",
            vertical: "middle",
          };

          // Style the data columns
          for (let i = 2; i <= 1 + monthNames.length; i++) {
            const cell = dataRow.getCell(i);
            cell.font = { size: 10, color: { argb: "FF000000" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFFFFF" },
            };
            cell.alignment = {
              horizontal: rowDef.type === "text" ? "left" : "right",
              vertical: "middle",
            };

            // Add borders
            cell.border = {
              top: { style: "thin", color: { argb: "FF000000" } },
              left: { style: "thin", color: { argb: "FF000000" } },
              bottom: { style: "thin", color: { argb: "FF000000" } },
              right: { style: "thin", color: { argb: "FF000000" } },
            };

            // Format numbers
            if (rowDef.type === "currency" && cell.value && cell.value !== "") {
              cell.numFmt = '"$"#,##0.00';
            } else if (
              rowDef.type === "percent" &&
              cell.value &&
              cell.value !== ""
            ) {
              cell.numFmt = "0.0%";
            }
          }

          // Add border to label column
          dataRow.getCell(1).border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
      }

      // Set column widths
      ws.getColumn(1).width = 20;
      for (let i = 2; i <= 1 + monthNames.length; i++) {
        ws.getColumn(i).width = 11;
      }

      // Set row heights
      for (let i = 1; i <= ws.rowCount; i++) {
        ws.getRow(i).height = 18;
      }
    }

    // Download the file
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_calendar_${marketName.replace(/\s+/g, "_")}_market_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  // Enhanced Excel export with professional styling - All products in one sheet
  const exportTableToExcel = async (
    accountId: string,
    accountData: ScanPlannerRow[]
  ) => {
    const account = dummyAccounts.find((a) => a.id === accountId);
    if (!account) {
      console.error("Account not found:", accountId);
      return;
    }
    const accountName = account.name;
    const productGroups = groupBy(accountData, "productId");

    const workbook = new ExcelJS.Workbook();

    // Month columns: JAN-DEC
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];

    // Create single worksheet for all products
    const ws = workbook.addWorksheet(`${accountName}_Scan_Calendar`);

    // 1. Title row with date
    const titleRow = ws.addRow([
      `PROPOSED SCAN CALENDAR LAYOUT ${new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      })} - ${accountName}`,
    ]);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF000000" } };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(1, 1, 1, 1 + monthNames.length);

    // Add blank row
    ws.addRow([]);

    // Define section rows with colors matching the image exactly
    const sectionRows = [
      {
        label: "BOTTLE COST",
        key: "bottleCostWithScan",
        type: "currency",
        bgColor: "FFF0F0F0", // Light gray
      },
      {
        label: "FRONTLINE SRP",
        key: "projectedRetail",
        type: "currency",
        bgColor: "FFF0F0F0", // Light gray
      },
      {
        label: "FRONTLINE MARGIN %",
        key: "retailMargin",
        type: "percent",
        bgColor: "FFF0F0F0", // Light gray
      },
      {
        label: "SCAN",
        key: "scanLevel1",
        type: "currency",
        bgColor: "FF87CEEB", // Light blue (matching image)
      },
      {
        label: "PROMO SRP",
        key: "promoSRP",
        type: "currency",
        bgColor: "FF87CEEB", // Light blue (matching SCAN)
      },
      {
        label: "PROMO MARGIN %",
        key: "promoMargin",
        type: "percent",
        bgColor: "FF87CEEB", // Light blue (matching SCAN)
      },
      {
        label: "LOYALTY PER BOTTLE",
        key: "loyaltyPerBottle",
        type: "currency",
        bgColor: "FFDA70D6", // Purple/orchid (matching image)
      },
      {
        label: "LOYALTY OFFER",
        key: "loyaltyOffer",
        type: "text",
        bgColor: "FFDA70D6", // Purple/orchid (matching image)
      },
      {
        label: "COMMENT",
        key: "comment",
        type: "text",
        bgColor: "FFDA70D6", // Purple/orchid (matching image)
      },
    ];

    // Loop through each product and add its section to the same worksheet
    const productEntries = Object.entries(productGroups);
    for (
      let productIndex = 0;
      productIndex < productEntries.length;
      productIndex++
    ) {
      const [productId, productData] = productEntries[productIndex];
      const productName =
        dummyProducts.find((p) => p.id === productId)?.name ||
        "Unknown Product";

      // Map: month short name (JAN, FEB, ...) -> row for that month
      const monthMap: Record<string, ScanPlannerRow | undefined> = {};
      for (const row of productData) {
        const m = new Date(row.weekOf)
          .toLocaleString("default", { month: "short" })
          .toUpperCase();
        monthMap[m] = row;
      }

      // Add spacing between products (except for the first one)
      if (productIndex > 0) {
        ws.addRow([]); // Empty row for spacing
      }

      // 2. Product header row with styling
      const productHeaderRow = ws.addRow([
        productName.toUpperCase(),
        ...monthNames,
      ]);
      productHeaderRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
      };
      productHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF333333" }, // Dark gray background
      };
      productHeaderRow.alignment = { horizontal: "center", vertical: "middle" };

      // Add borders to header
      for (let i = 1; i <= 1 + monthNames.length; i++) {
        productHeaderRow.getCell(i).border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      }

      // 3. Create data rows with styling for this product
      for (const rowDef of sectionRows) {
        const rowValues = [rowDef.label];

        for (const monthName of monthNames) {
          const data = monthMap[monthName];
          if (!data) {
            rowValues.push("");
          } else {
            const fieldValue = (data as any)[rowDef.key];
            if (rowDef.type === "currency") {
              rowValues.push(
                typeof fieldValue === "number" && fieldValue !== 0
                  ? fieldValue.toString()
                  : ""
              );
            } else if (rowDef.type === "percent") {
              rowValues.push(
                typeof fieldValue === "number" && fieldValue !== 0
                  ? (fieldValue / 100).toString()
                  : ""
              );
            } else {
              rowValues.push(
                fieldValue !== undefined && fieldValue !== "" ? fieldValue : ""
              );
            }
          }
        }

        const dataRow = ws.addRow(rowValues);

        // Style the label column (first column)
        dataRow.getCell(1).font = {
          bold: true,
          size: 10,
          color: { argb: "FF000000" },
        };
        dataRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowDef.bgColor },
        };
        dataRow.getCell(1).alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        // Style the data columns (white background for data)
        for (let i = 2; i <= 1 + monthNames.length; i++) {
          const cell = dataRow.getCell(i);
          cell.font = { size: 10, color: { argb: "FF000000" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFFFF" }, // White background for all data cells
          };
          cell.alignment = {
            horizontal: rowDef.type === "text" ? "left" : "right",
            vertical: "middle",
          };

          // Add borders
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };

          // Format numbers
          if (rowDef.type === "currency" && cell.value && cell.value !== "") {
            cell.numFmt = '"$"#,##0.00';
          } else if (
            rowDef.type === "percent" &&
            cell.value &&
            cell.value !== ""
          ) {
            cell.numFmt = "0.0%";
          }
        }

        // Add border to label column
        dataRow.getCell(1).border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      }
    }

    // 4. Set column widths for better visibility
    ws.getColumn(1).width = 20; // Label column
    for (let i = 2; i <= 1 + monthNames.length; i++) {
      ws.getColumn(i).width = 11; // Month columns
    }

    // Set row heights
    for (let i = 1; i <= ws.rowCount; i++) {
      ws.getRow(i).height = 18;
    }

    // Download the file
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_calendar_${accountName.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  // Update account selection to only show accounts for selected market
  const filteredAccounts = selectedMarket
    ? dummyAccounts.filter((acc) => acc.marketId === selectedMarket)
    : [];

  // Update selectedAccount to reset if market changes
  useEffect(() => {
    setSelectedAccount("");
  }, [selectedMarket]);

  // Helper: get accounts for selected markets
  const forecastFilteredAccounts = forecastSelectedMarkets.length
    ? dummyAccounts.filter((acc) =>
        forecastSelectedMarkets.includes(acc.marketId)
      )
    : [];

  // Helper: months and ACT/FCST
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const currentMonthIdx = new Date().getMonth();
  const getMonthType = (idx: number) =>
    idx <= currentMonthIdx ? "ACT" : "FCST";

  const MAX_CHIPS_VISIBLE = 3;

  // Enhanced column configuration for forecasting and progression table
  const forecastColumns = useMemo((): Column[] => {
    const baseColumns: Column[] = [
      {
        key: "metric",
        header: "Budget Hierarchy (2026 Plan)",
        align: "left",
        sortable: true,
        sx: {
          py: "4px",
          px: "12px",
          position: "sticky",
          left: 0,
          backgroundColor: "#fff",
          zIndex: 1,
          minWidth: 280,
        },
        render: (value: string, row: any) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {(row.type === "market" || row.type === "account") && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowExpansion(row.id, row.type);
                }}
                sx={{ p: 0.25, minWidth: 20, height: 20 }}
              >
                {expandedRows.has(row.id) ? (
                  <KeyboardArrowDownIcon fontSize="inherit" />
                ) : (
                  <KeyboardArrowRightIcon fontSize="inherit" />
                )}
              </IconButton>
            )}
            <Typography
              variant="body2"
              fontWeight={row.level === 0 ? 600 : row.level === 1 ? 500 : 400}
              color={
                row.level === 0
                  ? "primary.main"
                  : row.level === 1
                  ? "text.primary"
                  : "text.secondary"
              }
              sx={{
                fontSize: row.level === 0 ? "0.85rem" : "0.8rem",
                ml: row.type === "product" ? 0.5 : 0,
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          </Box>
        ),
      },
    ];

    // Add monthly columns with enhanced styling and clickable functionality
    const monthColumns: Column[] = monthNames.map((month, idx) => ({
      key: month.toLowerCase(),
      header: month,
      subHeader: getMonthType(idx),
      align: "center" as const,
      sortable: true,
      sx: {
        py: "2px",
        px: "4px",
        minWidth: 85,
        maxWidth: 90,
        backgroundColor: idx <= currentMonthIdx ? "#f0f7ff" : "#fafbff",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#e3f2fd",
        },
      },
      render: (_, row: any) => {
        if (!row.monthData || !row.monthData[idx]) return "-";

        const monthData = row.monthData[idx];
        const baseline2025 = monthData.baseline2025;
        const forecast2026 = monthData.forecast2026;

        const volumeChange = baseline2025.volume
          ? ((forecast2026.volume - baseline2025.volume) /
              baseline2025.volume) *
            100
          : 0;

        return (
          <Box
            onClick={() => handleMonthCellClick(month, idx, row)}
            sx={{
              cursor: "pointer",
              p: 0.5,
              borderRadius: 0.5,
              "&:hover": {
                backgroundColor: "rgba(25, 118, 210, 0.08)",
              },
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="primary.main"
              sx={{ fontSize: "0.7rem" }}
            >
              {forecast2026.volume?.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }) || "-"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.65rem", display: "block" }}
            >
              {baseline2025.volume?.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }) || "-"}
            </Typography>
            <Typography
              variant="caption"
              color={
                volumeChange > 0
                  ? "success.main"
                  : volumeChange < 0
                  ? "error.main"
                  : "text.secondary"
              }
              sx={{ fontSize: "0.6rem", display: "block", fontWeight: 500 }}
            >
              {volumeChange > 0 ? "+" : ""}
              {volumeChange.toFixed(0)}%
            </Typography>
            <Typography
              variant="caption"
              fontWeight={500}
              color="warning.main"
              sx={{ fontSize: "0.65rem", display: "block" }}
            >
              ${(forecast2026.spend / 1000).toFixed(0)}k
            </Typography>
          </Box>
        );
      },
    }));

    // Add summary columns
    const summaryColumns: Column[] = [
      {
        key: "forecast2026Total",
        header: "2026 Total",
        subHeader: "Forecast",
        align: "right" as const,
        sortable: true,
        sx: {
          py: "4px",
          px: "12px",
          backgroundColor: "#f0f7ff",
          borderLeft: "2px solid #1976d2",
          minWidth: 110,
        },
        render: (value: number, row: any) => (
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="primary.main"
              sx={{ fontSize: "0.75rem" }}
            >
              {value?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ||
                "-"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.65rem", display: "block" }}
            >
              Cases
            </Typography>
          </Box>
        ),
      },
      {
        key: "forecastSpendTotal",
        header: "2026 Budget",
        subHeader: "Forecast",
        align: "right" as const,
        sortable: true,
        sx: {
          py: "4px",
          px: "12px",
          backgroundColor: "#f0f7ff",
          minWidth: 100,
        },
        render: (value: number, row: any) => (
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="primary.main"
              sx={{ fontSize: "0.75rem" }}
            >
              ${(value / 1000)?.toFixed(0) || "-"}k
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.65rem", display: "block" }}
            >
              Spend
            </Typography>
          </Box>
        ),
      },
      {
        key: "variance",
        header: "vs 2025",
        subHeader: "Change",
        align: "right" as const,
        sortable: true,
        sx: {
          py: "4px",
          px: "12px",
          backgroundColor: "#f8fff8",
          minWidth: 90,
        },
        render: (_, row: any) => {
          const volumeChange = row.baseline2025Total
            ? ((row.forecast2026Total - row.baseline2025Total) /
                row.baseline2025Total) *
              100
            : 0;
          const spendChange = row.baselineSpendTotal
            ? ((row.forecastSpendTotal - row.baselineSpendTotal) /
                row.baselineSpendTotal) *
              100
            : 0;

          return (
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="caption"
                fontWeight={600}
                color={
                  volumeChange > 0
                    ? "success.main"
                    : volumeChange < 0
                    ? "error.main"
                    : "text.primary"
                }
                sx={{ fontSize: "0.7rem" }}
              >
                {volumeChange > 0 ? "+" : ""}
                {volumeChange.toFixed(0)}%
              </Typography>
              <Typography
                variant="caption"
                color={
                  spendChange > 0
                    ? "error.main"
                    : spendChange < 0
                    ? "success.main"
                    : "text.secondary"
                }
                sx={{ fontSize: "0.65rem", display: "block" }}
              >
                ${spendChange > 0 ? "+" : ""}
                {spendChange.toFixed(0)}%
              </Typography>
            </Box>
          );
        },
      },
    ];

    return [...baseColumns, ...monthColumns, ...summaryColumns];
  }, [monthNames, currentMonthIdx]);

  // Enhanced hierarchical data structure for budget planning (2025 baseline → 2026 forecast)
  const forecastData = useMemo(() => {
    const currentYear = new Date().getFullYear(); // 2025
    const forecastYear = currentYear + 1; // 2026

    // Helper function to generate realistic baseline data for 2025
    const generateBaselineData = (
      marketId: string,
      accountId?: string,
      productId?: string
    ) => {
      const baseVolume =
        marketId === "CA" ? 400 : marketId === "TX" ? 350 : 300;
      const baseSpend =
        marketId === "CA" ? 70000 : marketId === "TX" ? 60000 : 50000;
      const seasonalityFactors = [
        0.9, 0.85, 1.1, 1.2, 1.3, 1.4, 1.5, 1.4, 1.2, 1.1, 0.95, 0.8,
      ]; // Jan-Dec

      return monthNames.map((month, idx) => {
        const seasonalFactor = seasonalityFactors[idx];
        const accountFactor = accountId
          ? accountId.includes("costco")
            ? 1.2
            : accountId.includes("walmart")
            ? 1.1
            : 1.0
          : 1.0;
        const productFactor = productId
          ? productId.includes("premium")
            ? 1.3
            : productId.includes("standard")
            ? 1.0
            : 0.8
          : 1.0;

        return {
          month: month.toLowerCase(),
          baseline2025: {
            volume: Math.round(
              baseVolume * seasonalFactor * accountFactor * productFactor
            ),
            spend: Math.round(
              baseSpend * seasonalFactor * accountFactor * productFactor
            ),
            avgPrice: 8.5 + Math.random() * 2,
            margin: 0.15 + Math.random() * 0.1,
          },
          forecast2026: {
            volume: Math.round(
              baseVolume *
                seasonalFactor *
                accountFactor *
                productFactor *
                (1 + (Math.random() * 0.2 - 0.1))
            ), // ±10% variance
            spend: Math.round(
              baseSpend *
                seasonalFactor *
                accountFactor *
                productFactor *
                (1 + (Math.random() * 0.2 - 0.1))
            ),
            avgPrice: 8.5 + Math.random() * 2,
            margin: 0.15 + Math.random() * 0.1,
          },
          isActual: idx <= currentMonthIdx && currentYear === 2025,
          monthType: getMonthType(idx),
        };
      });
    };

    // Create hierarchical data structure
    const hierarchicalData: any[] = [];

    // Market Level Data
    forecastSelectedMarkets.forEach((marketId) => {
      const market = dummyMarkets.find((m) => m.id === marketId);
      if (!market) return;

      const marketMonthData = generateBaselineData(marketId);
      const marketTotals = {
        baseline2025Total: marketMonthData.reduce(
          (sum, m) => sum + m.baseline2025.volume,
          0
        ),
        forecast2026Total: marketMonthData.reduce(
          (sum, m) => sum + m.forecast2026.volume,
          0
        ),
        baselineSpendTotal: marketMonthData.reduce(
          (sum, m) => sum + m.baseline2025.spend,
          0
        ),
        forecastSpendTotal: marketMonthData.reduce(
          (sum, m) => sum + m.forecast2026.spend,
          0
        ),
      };

      hierarchicalData.push({
        id: `market-${marketId}`,
        type: "market",
        level: 0,
        marketId,
        marketName: market.name,
        metric: `📍 ${market.name} Market`,
        category: "Market Overview",
        isExpanded: true,
        monthData: marketMonthData,
        ...marketTotals,
        children: [],
      });

      // Account Level Data (within selected markets)
      // Only show accounts if they are explicitly selected in the account filter
      const accountsInMarket =
        forecastSelectedAccounts.length > 0
          ? dummyAccounts.filter(
              (acc) =>
                forecastSelectedAccounts.includes(acc.id) &&
                acc.marketId === marketId
            )
          : []; // Don't show any accounts if none are specifically selected

      accountsInMarket.forEach((account) => {
        const accountMonthData = generateBaselineData(marketId, account.id);
        const accountTotals = {
          baseline2025Total: accountMonthData.reduce(
            (sum, m) => sum + m.baseline2025.volume,
            0
          ),
          forecast2026Total: accountMonthData.reduce(
            (sum, m) => sum + m.forecast2026.volume,
            0
          ),
          baselineSpendTotal: accountMonthData.reduce(
            (sum, m) => sum + m.baseline2025.spend,
            0
          ),
          forecastSpendTotal: accountMonthData.reduce(
            (sum, m) => sum + m.forecast2026.spend,
            0
          ),
        };

        hierarchicalData.push({
          id: `account-${account.id}`,
          type: "account",
          level: 1,
          marketId,
          accountId: account.id,
          accountName: account.name,
          metric: `  🏪 ${account.name}`,
          category: "Account Details",
          isExpanded: false,
          monthData: accountMonthData,
          ...accountTotals,
          children: [],
        });

        // Product Level Data (within accounts)
        const productsInAccount = dummyProducts
          .filter((p) => p.accountId === account.id)
          .slice(0, 2); // Show first 2 products

        productsInAccount.forEach((product) => {
          const productMonthData = generateBaselineData(
            marketId,
            account.id,
            product.id
          );
          const productTotals = {
            baseline2025Total: productMonthData.reduce(
              (sum, m) => sum + m.baseline2025.volume,
              0
            ),
            forecast2026Total: productMonthData.reduce(
              (sum, m) => sum + m.forecast2026.volume,
              0
            ),
            baselineSpendTotal: productMonthData.reduce(
              (sum, m) => sum + m.baseline2025.spend,
              0
            ),
            forecastSpendTotal: productMonthData.reduce(
              (sum, m) => sum + m.forecast2026.spend,
              0
            ),
          };

          hierarchicalData.push({
            id: `product-${product.id}`,
            type: "product",
            level: 2,
            marketId,
            accountId: account.id,
            productId: product.id,
            productName: product.name,
            metric: `    📦 ${product.name}`,
            category: "Product Performance",
            isExpanded: false,
            monthData: productMonthData,
            ...productTotals,
          });
        });
      });
    });

    return hierarchicalData;
  }, [
    forecastSelectedMarkets,
    forecastSelectedAccounts,
    monthNames,
    currentMonthIdx,
  ]);

  // State for detailed month modal
  const [monthDetailModalOpen, setMonthDetailModalOpen] = useState(false);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<{
    month: string;
    monthIndex: number;
    rowData: any;
    baseline2025: any;
    forecast2026: any;
  } | null>(null);

  // State for budget comparison
  const [selectedBudgetLevel, setSelectedBudgetLevel] = useState<
    "overall" | "market" | "account"
  >("overall");
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");

  // State for hierarchical expansion
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(["market-CA", "market-TX", "market-NY"])
  );

  // Handler for expanding/collapsing rows
  const handleRowExpansion = (
    rowId: string,
    rowType: "market" | "account" | "product"
  ) => {
    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
      // Also collapse children
      if (rowType === "market") {
        forecastData.forEach((row) => {
          if (
            row.type === "account" &&
            row.marketId === rowId.replace("market-", "")
          ) {
            newExpanded.delete(row.id);
          }
          if (
            row.type === "product" &&
            row.marketId === rowId.replace("market-", "")
          ) {
            newExpanded.delete(row.id);
          }
        });
      } else if (rowType === "account") {
        forecastData.forEach((row) => {
          if (
            row.type === "product" &&
            row.accountId === rowId.replace("account-", "")
          ) {
            newExpanded.delete(row.id);
          }
        });
      }
    } else {
      newExpanded.add(rowId);
    }

    setExpandedRows(newExpanded);
  };

  // Handler for month cell click
  const handleMonthCellClick = (
    month: string,
    monthIndex: number,
    rowData: any
  ) => {
    const monthData = rowData.monthData[monthIndex];
    setSelectedMonthDetail({
      month,
      monthIndex,
      rowData,
      baseline2025: monthData.baseline2025,
      forecast2026: monthData.forecast2026,
    });
    setMonthDetailModalOpen(true);
  };

  // Filter data based on expansion state
  const visibleForecastData = useMemo(() => {
    return forecastData.filter((row) => {
      if (row.level === 0) return true; // Always show markets

      if (row.level === 1) {
        // Show accounts if parent market is expanded
        return expandedRows.has(`market-${row.marketId}`);
      }

      if (row.level === 2) {
        // Show products if parent account is expanded
        return (
          expandedRows.has(`account-${row.accountId}`) &&
          expandedRows.has(`market-${row.marketId}`)
        );
      }

      return false;
    });
  }, [forecastData, expandedRows]);

  // Get available budget options for comparison
  const getAvailableBudgetOptions = () => {
    const options: {
      level: "overall" | "market" | "account";
      label: string;
      value: string;
      amount: number | "";
    }[] = [];

    // Overall budget
    if (overallBudget) {
      options.push({
        level: "overall",
        label: `Overall Budget ($${Number(overallBudget).toLocaleString()})`,
        value: "overall",
        amount: overallBudget,
      });
    }

    // Market budgets
    Object.entries(marketBudgets).forEach(([marketId, budget]) => {
      if (budget) {
        const market = dummyMarkets.find((m) => m.id === marketId);
        options.push({
          level: "market",
          label: `${market?.name} Market ($${Number(budget).toLocaleString()})`,
          value: marketId,
          amount: budget,
        });
      }
    });

    // Account budgets
    Object.entries(accountBudgets).forEach(([key, budget]) => {
      if (budget) {
        const [marketId, accountId] = key.split("_");
        const market = dummyMarkets.find((m) => m.id === marketId);
        const account = dummyAccounts.find((a) => a.id === accountId);
        options.push({
          level: "account",
          label: `${market?.name} - ${account?.name} ($${Number(
            budget
          ).toLocaleString()})`,
          value: key,
          amount: budget,
        });
      }
    });

    return options;
  };

  // Get selected budget amount
  const getSelectedBudgetAmount = () => {
    const options = getAvailableBudgetOptions();
    const selected = options.find(
      (opt) =>
        opt.level === selectedBudgetLevel &&
        (selectedBudgetLevel === "overall"
          ? true
          : opt.value === selectedBudgetId)
    );
    return selected?.amount || 0;
  };

  // Enhanced Month Detail Modal with Budget Comparison
  const renderMonthDetailModal = () => (
    <Dialog
      open={monthDetailModalOpen}
      onClose={() => setMonthDetailModalOpen(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 24px 38px 3px rgba(0,0,0,0.14)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            {selectedMonthDetail?.month} 2026 - Budget Planning Detail
          </Typography>
          <Chip
            label={selectedMonthDetail?.rowData.metric || ""}
            size="small"
            sx={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {selectedMonthDetail && (
          <Box>
            {/* Budget Selection Header */}
            <Box
              sx={{
                p: 3,
                backgroundColor: "#f8f9ff",
                borderBottom: "1px solid #e0e7ff",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                color="primary.main"
                fontWeight={600}
              >
                Compare Against Budget
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel>Select Budget to Compare</InputLabel>
                  <Select
                    value={
                      selectedBudgetLevel === "overall"
                        ? "overall"
                        : selectedBudgetId
                    }
                    onChange={(e) => {
                      const options = getAvailableBudgetOptions();
                      const selected = options.find((opt) =>
                        opt.level === "overall"
                          ? e.target.value === "overall"
                          : opt.value === e.target.value
                      );
                      if (selected) {
                        setSelectedBudgetLevel(selected.level);
                        setSelectedBudgetId(
                          selected.level === "overall" ? "" : selected.value
                        );
                      }
                    }}
                    input={<OutlinedInput label="Select Budget to Compare" />}
                  >
                    {getAvailableBudgetOptions().map((option) => (
                      <MenuItem
                        key={
                          option.level === "overall" ? "overall" : option.value
                        }
                        value={
                          option.level === "overall" ? "overall" : option.value
                        }
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {getSelectedBudgetAmount() > 0 && (
                  <Chip
                    label={`Budget: $${Number(
                      getSelectedBudgetAmount()
                    ).toLocaleString()}`}
                    color="primary"
                    variant="filled"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
            </Box>

            <Grid container spacing={0}>
              {/* Left Side - Input Controls */}
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 3, height: "100%", backgroundColor: "#fbfcfd" }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    color="primary.main"
                    fontWeight={600}
                  >
                    Forecast Adjustments
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle1"
                      color="text.secondary"
                      gutterBottom
                      fontWeight={500}
                    >
                      📊 2025 Baseline (Historical)
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <TextField
                        label="Volume (Cases)"
                        value={selectedMonthDetail.baseline2025.volume.toLocaleString()}
                        disabled
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, color: "text.secondary" }}>
                              📦
                            </Typography>
                          ),
                        }}
                      />
                      <TextField
                        label="Spend"
                        value={`$${selectedMonthDetail.baseline2025.spend.toLocaleString()}`}
                        disabled
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, color: "text.secondary" }}>
                              💰
                            </Typography>
                          ),
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle1"
                      color="primary.main"
                      gutterBottom
                      fontWeight={600}
                    >
                      🎯 2026 Forecast (Editable)
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <TextField
                        label="Volume (Cases)"
                        type="number"
                        defaultValue={selectedMonthDetail.forecast2026.volume}
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, color: "primary.main" }}>
                              📦
                            </Typography>
                          ),
                        }}
                        onChange={(e) => {
                          console.log("Volume changed to:", e.target.value);
                        }}
                      />
                      <TextField
                        label="Spend"
                        type="number"
                        defaultValue={selectedMonthDetail.forecast2026.spend}
                        size="small"
                        sx={{ flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <Typography sx={{ mr: 1, color: "primary.main" }}>
                              💰
                            </Typography>
                          ),
                        }}
                        onChange={(e) => {
                          console.log("Spend changed to:", e.target.value);
                        }}
                      />
                    </Box>
                  </Box>

                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: "rgba(25, 118, 210, 0.04)",
                      border: "1px solid rgba(25, 118, 210, 0.12)",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      fontWeight={600}
                      color="primary.main"
                    >
                      📈 Impact Analysis
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Volume Change:
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            ((selectedMonthDetail.forecast2026.volume -
                              selectedMonthDetail.baseline2025.volume) /
                              selectedMonthDetail.baseline2025.volume) *
                              100 >
                            0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {(
                            ((selectedMonthDetail.forecast2026.volume -
                              selectedMonthDetail.baseline2025.volume) /
                              selectedMonthDetail.baseline2025.volume) *
                            100
                          ).toFixed(1)}
                          %
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Spend Change:
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            ((selectedMonthDetail.forecast2026.spend -
                              selectedMonthDetail.baseline2025.spend) /
                              selectedMonthDetail.baseline2025.spend) *
                              100 >
                            0
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {(
                            ((selectedMonthDetail.forecast2026.spend -
                              selectedMonthDetail.baseline2025.spend) /
                              selectedMonthDetail.baseline2025.spend) *
                            100
                          ).toFixed(1)}
                          %
                        </Typography>
                      </Box>
                      {getSelectedBudgetAmount() > 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Budget Utilization:
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={
                              (selectedMonthDetail.forecast2026.spend /
                                Number(getSelectedBudgetAmount())) *
                                100 >
                              80
                                ? "error.main"
                                : (selectedMonthDetail.forecast2026.spend /
                                    Number(getSelectedBudgetAmount())) *
                                    100 >
                                  60
                                ? "warning.main"
                                : "success.main"
                            }
                          >
                            {(
                              (selectedMonthDetail.forecast2026.spend /
                                Number(getSelectedBudgetAmount())) *
                              100
                            ).toFixed(1)}
                            %
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Grid>

              {/* Right Side - Enhanced Visualization */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 3,
                    height: "100%",
                    backgroundColor: "white",
                    borderLeft: "1px solid #f0f0f0",
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    color="primary.main"
                    fontWeight={600}
                  >
                    📊 Budget vs Forecast Visualization
                  </Typography>

                  {/* Horizontal Bar Chart Style Visualization */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight={500}
                    >
                      Volume Comparison (Cases)
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          2025 Baseline
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {selectedMonthDetail.baseline2025.volume.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          backgroundColor: "#f0f7ff",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${
                              (selectedMonthDetail.baseline2025.volume /
                                Math.max(
                                  selectedMonthDetail.baseline2025.volume,
                                  selectedMonthDetail.forecast2026.volume
                                )) *
                              100
                            }%`,
                            height: "100%",
                            backgroundColor: "#90caf9",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="primary.main"
                          fontWeight={600}
                        >
                          2026 Forecast
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color="primary.main"
                        >
                          {selectedMonthDetail.forecast2026.volume.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          backgroundColor: "#f0f7ff",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${
                              (selectedMonthDetail.forecast2026.volume /
                                Math.max(
                                  selectedMonthDetail.baseline2025.volume,
                                  selectedMonthDetail.forecast2026.volume
                                )) *
                              100
                            }%`,
                            height: "100%",
                            backgroundColor: "#1976d2",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight={500}
                    >
                      Spend Comparison ($)
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          2025 Baseline
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          $
                          {(
                            selectedMonthDetail.baseline2025.spend / 1000
                          ).toFixed(0)}
                          k
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          backgroundColor: "#fff3e0",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${
                              (selectedMonthDetail.baseline2025.spend /
                                Math.max(
                                  selectedMonthDetail.baseline2025.spend,
                                  selectedMonthDetail.forecast2026.spend
                                )) *
                              100
                            }%`,
                            height: "100%",
                            backgroundColor: "#ffcc02",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="warning.main"
                          fontWeight={600}
                        >
                          2026 Forecast
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color="warning.main"
                        >
                          $
                          {(
                            selectedMonthDetail.forecast2026.spend / 1000
                          ).toFixed(0)}
                          k
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          backgroundColor: "#fff3e0",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${
                              (selectedMonthDetail.forecast2026.spend /
                                Math.max(
                                  selectedMonthDetail.baseline2025.spend,
                                  selectedMonthDetail.forecast2026.spend
                                )) *
                              100
                            }%`,
                            height: "100%",
                            backgroundColor: "#ff9800",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Budget Comparison */}
                  {getSelectedBudgetAmount() > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        fontWeight={500}
                      >
                        Budget Utilization
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Available Budget
                          </Typography>
                          <Typography variant="caption" fontWeight={600}>
                            $
                            {(Number(getSelectedBudgetAmount()) / 1000).toFixed(
                              0
                            )}
                            k
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: "100%",
                            height: 12,
                            backgroundColor: "#f3e5f5",
                            borderRadius: 1,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              backgroundColor: "#e1bee7",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="secondary.main"
                            fontWeight={600}
                          >
                            Forecast Usage
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="secondary.main"
                          >
                            $
                            {(
                              selectedMonthDetail.forecast2026.spend / 1000
                            ).toFixed(0)}
                            k (
                            {(
                              (selectedMonthDetail.forecast2026.spend /
                                Number(getSelectedBudgetAmount())) *
                              100
                            ).toFixed(1)}
                            %)
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: "100%",
                            height: 12,
                            backgroundColor: "#f3e5f5",
                            borderRadius: 1,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(
                                (selectedMonthDetail.forecast2026.spend /
                                  Number(getSelectedBudgetAmount())) *
                                  100,
                                100
                              )}%`,
                              height: "100%",
                              backgroundColor:
                                (selectedMonthDetail.forecast2026.spend /
                                  Number(getSelectedBudgetAmount())) *
                                  100 >
                                100
                                  ? "#f44336"
                                  : "#9c27b0",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight={500}
                    >
                      🏷️ Context Information
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        <strong>Market:</strong>{" "}
                        {selectedMonthDetail.rowData.marketName}
                      </Typography>
                      {selectedMonthDetail.rowData.accountName && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Account:</strong>{" "}
                          {selectedMonthDetail.rowData.accountName}
                        </Typography>
                      )}
                      {selectedMonthDetail.rowData.productName && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Product:</strong>{" "}
                          {selectedMonthDetail.rowData.productName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          p: 3,
          backgroundColor: "#f8f9ff",
          borderTop: "1px solid #e0e7ff",
        }}
      >
        <Button
          onClick={() => setMonthDetailModalOpen(false)}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => setMonthDetailModalOpen(false)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Budget Management Modals */}
      {renderBudgetManagementModal()}
      {renderAccountBudgetModal()}
      {/* Month Detail Modal */}
      {renderMonthDetailModal()}
      {/* Forecasting & Progression Modal */}
      <Paper sx={{ p: 2, mb: 2, boxShadow: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 500, color: theme.palette.primary.main }}
          >
            FORECASTING & PROGRESSION
          </Typography>
          <Box
            sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 2 }}
          >
            {/* Placeholder controls for future expansion */}
            <Button
              size="small"
              variant="outlined"
              color="primary"
              sx={{ minWidth: 80 }}
            >
              Undo
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              sx={{ minWidth: 100 }}
            >
              Guidance
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              sx={{ minWidth: 120 }}
            >
              Export CSV
            </Button>
            <IconButton onClick={() => setForecastModalOpen((open) => !open)}>
              {forecastModalOpen ? (
                <KeyboardArrowUpIcon />
              ) : (
                <KeyboardArrowDownIcon />
              )}
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              sx={{ minWidth: 120 }}
              onClick={() => setBudgetModalOpen(true)}
            >
              Manage Budgets
            </Button>
          </Box>
        </Box>
        <Collapse in={forecastModalOpen}>
          <Tabs
            value={forecastTabValue}
            onChange={(_, newValue) => setForecastTabValue(newValue)}
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Progression" />
            {/* Future: Add more tabs here */}
          </Tabs>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Autocomplete
              multiple
              limitTags={MAX_CHIPS_VISIBLE}
              options={dummyMarkets}
              getOptionLabel={(option) => option.name}
              value={dummyMarkets.filter((m) =>
                forecastSelectedMarkets.includes(m.id)
              )}
              onChange={(_, newValue) =>
                setForecastSelectedMarkets(newValue.map((m) => m.id))
              }
              filterSelectedOptions
              renderInput={(params) => (
                <TextField {...params} label="Filter Markets" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{
                      borderRadius: "16px",
                      backgroundColor: "transparent",
                      "& .MuiChip-label": { px: 1 },
                    }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              sx={{ width: "100%", maxWidth: 320 }}
            />
            <Autocomplete
              multiple
              limitTags={MAX_CHIPS_VISIBLE}
              options={forecastFilteredAccounts}
              getOptionLabel={(option) => option.name}
              value={forecastFilteredAccounts.filter((a) =>
                forecastSelectedAccounts.includes(a.id)
              )}
              onChange={(_, newValue) =>
                setForecastSelectedAccounts(newValue.map((a) => a.id))
              }
              filterSelectedOptions
              renderInput={(params) => (
                <TextField {...params} label="Filter Accounts" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{
                      borderRadius: "16px",
                      backgroundColor: "transparent",
                      "& .MuiChip-label": { px: 1 },
                    }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              sx={{ width: "100%", maxWidth: 320 }}
              disabled={forecastSelectedMarkets.length === 0}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              "& .MuiTableContainer-root": {
                backgroundColor: "#fafbff",
                borderRadius: 2,
                border: "1px solid #e3f2fd",
              },
              "& .MuiTableHead-root": {
                "& .MuiTableCell-head": {
                  backgroundColor: "#f8f9ff",
                  color: "#1976d2",
                  fontWeight: 600,
                  borderBottom: "2px solid #e3f2fd",
                  padding: "8px 12px",
                  fontSize: "0.75rem",
                },
              },
              "& .MuiTableBody-root": {
                "& .MuiTableRow-root": {
                  height: "auto",
                  minHeight: "32px",
                  "&:nth-of-type(even)": {
                    backgroundColor: "#fafbff",
                  },
                  "&:hover": {
                    backgroundColor: "#f0f7ff",
                  },
                  "& .MuiTableCell-root": {
                    padding: "4px 8px",
                    borderBottom: "1px solid #f0f0f0",
                  },
                },
              },
            }}
          >
            <DynamicTable
              data={visibleForecastData}
              columns={forecastColumns}
              stickyHeader={true}
              enableColumnFiltering={false}
              maxHeight="calc(100vh - 500px)"
              defaultRowsPerPage={15}
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </Box>
          {/* Future: Add budget, progression, rollover, and product-level breakdowns here */}
          {(forecastSelectedMarkets.length > 0 ||
            forecastSelectedAccounts.length > 0 ||
            overallBudget) && (
            <Box sx={{ mb: 2, mt: 1 }}>
              <Typography variant="subtitle2" color="primary">
                Budget: ${getBudgetForSelection() || "-"}
              </Typography>
            </Box>
          )}
        </Collapse>
      </Paper>
      <Divider sx={{ my: 3 }} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: (theme) => theme.palette.primary.main,
            }}
          >
            SCAN PLANNER
          </Typography>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}
          >
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="market-select-label">Select Market</InputLabel>
              <Select
                labelId="market-select-label"
                value={selectedMarket}
                onChange={(event) => setSelectedMarket(event.target.value)}
                input={<OutlinedInput label="Select Market" />}
              >
                {dummyMarkets.map((market) => (
                  <MenuItem key={market.id} value={market.id}>
                    {market.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="account-select-label">Select Account</InputLabel>
              <Select
                labelId="account-select-label"
                value={selectedAccount}
                onChange={(event) => setSelectedAccount(event.target.value)}
                input={<OutlinedInput label="Select Account" />}
                disabled={!selectedMarket}
              >
                {filteredAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() =>
                setUserRole(userRole === "sales" ? "finance" : "sales")
              }
              sx={{ minWidth: 100 }}
            >
              {userRole === "sales" ? "Switch to Finance" : "Switch to Sales"}
            </Button>
            {userRole === "sales" && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ ml: 1 }}
                  onClick={() => setAddAccountDialogOpen(true)}
                >
                  Add Account
                </Button>
                {selectedAccount && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{ ml: 1 }}
                    onClick={() => {
                      setNewProductAccountId(selectedAccount);
                      setAddProductDialogOpen(true);
                    }}
                  >
                    Add Product
                  </Button>
                )}
              </>
            )}
            {userRole === "finance" && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="account-select-label">Accounts</InputLabel>
                <Select
                  labelId="account-select-label"
                  multiple
                  value={selectedAccounts}
                  onChange={(event) =>
                    setSelectedAccounts(event.target.value as string[])
                  }
                  input={<OutlinedInput label="Accounts" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={
                            dummyAccounts.find((acc) => acc.id === value)?.name
                          }
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {dummyAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Tooltip title="Open Calendar">
              <IconButton onClick={() => setIsCalendarOpen(true)}>
                <CalendarMonthIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowUpIcon />
              )}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={!isCollapsed}>
          {userRole === "sales" ? (
            // Sales view
            selectedAccount ? (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>
                    {
                      dummyAccounts.find((acc) => acc.id === selectedAccount)
                        ?.name
                    }
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Tooltip
                      title={
                        accountStatuses[selectedAccount]?.status === "approved"
                          ? `Approved by ${
                              accountStatuses[selectedAccount]?.approvedBy
                            } on ${accountStatuses[
                              selectedAccount
                            ]?.approvedAt?.toLocaleDateString()}`
                          : accountStatuses[selectedAccount]?.status ===
                            "rejected"
                          ? `Rejected by ${
                              accountStatuses[selectedAccount]?.approvedBy
                            } on ${accountStatuses[
                              selectedAccount
                            ]?.approvedAt?.toLocaleDateString()}`
                          : accountStatuses[selectedAccount]?.status ===
                            "pending"
                          ? `Submitted by ${
                              accountStatuses[selectedAccount]?.submittedBy
                            } on ${accountStatuses[
                              selectedAccount
                            ]?.submittedAt?.toLocaleDateString()}`
                          : ""
                      }
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Chip
                          label={
                            accountStatuses[selectedAccount]?.status || "draft"
                          }
                          color={
                            accountStatuses[selectedAccount]?.status ===
                            "approved"
                              ? "success"
                              : accountStatuses[selectedAccount]?.status ===
                                "rejected"
                              ? "error"
                              : accountStatuses[selectedAccount]?.status ===
                                "pending"
                              ? "warning"
                              : "default"
                          }
                        />
                        {(accountStatuses[selectedAccount]?.status ===
                          "pending" ||
                          accountStatuses[selectedAccount]?.status ===
                            "rejected" ||
                          accountStatuses[selectedAccount]?.status ===
                            "approved") &&
                          accountStatuses[selectedAccount]?.comments && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleCommentClick(
                                  accountStatuses[selectedAccount]?.comments ||
                                    ""
                                )
                              }
                            >
                              <CommentIcon
                                fontSize="small"
                                color={
                                  accountStatuses[selectedAccount]?.status ===
                                  "rejected"
                                    ? "error"
                                    : accountStatuses[selectedAccount]
                                        ?.status === "pending"
                                    ? "warning"
                                    : "success"
                                }
                              />
                            </IconButton>
                          )}
                      </Box>
                    </Tooltip>
                    {accountStatuses[selectedAccount]?.status ===
                      "approved" && (
                      <>
                        <Button
                          startIcon={<PictureAsPdfIcon />}
                          variant="outlined"
                          onClick={() =>
                            exportTableToPDF(selectedAccount, filteredData)
                          }
                        >
                          Export PDF
                        </Button>
                        <Button
                          startIcon={<TableChartIcon />}
                          variant="outlined"
                          onClick={() =>
                            exportTableToExcel(selectedAccount, filteredData)
                          }
                        >
                          Export Excel
                        </Button>
                      </>
                    )}
                    {accountStatuses[selectedAccount]?.status === "pending" && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleCancelSubmission(selectedAccount)}
                      >
                        Cancel Submission
                      </Button>
                    )}
                    {(accountStatuses[selectedAccount]?.status === "draft" ||
                      (accountStatuses[selectedAccount]?.status ===
                        "rejected" &&
                        accountStatuses[selectedAccount]?.isManuallyModified) ||
                      (accountStatuses[selectedAccount]?.status === "pending" &&
                        accountStatuses[selectedAccount]
                          ?.isManuallyModified)) && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleSubmitForApproval(selectedAccount)}
                      >
                        Submit Account for Approval
                      </Button>
                    )}
                    {selectedMarket &&
                      marketStatuses[selectedMarket]?.status !== "pending" && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() =>
                            handleSubmitMarketForApproval(selectedMarket)
                          }
                          sx={{ ml: 1 }}
                        >
                          Submit Entire Market for Approval
                        </Button>
                      )}
                  </Box>
                </Box>
                {Object.entries(groupedData).map(([productId, productData]) => (
                  <Box key={productId} sx={{ mb: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        {
                          dummyProducts.find((prod) => prod.id === productId)
                            ?.name
                        }
                      </Typography>
                      <Tooltip title="Add New Entry">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            handleRowClick({
                              id: `new-${Date.now()}`,
                              accountId: selectedAccount,
                              productId,
                              weekOf: new Date(),
                              scanLevel1: 0,
                              qd: 0,
                              da: 0,
                              loyalty: 0,
                              retailMargin: 0,
                              bottleCostWithScan: 0,
                              supplierMarginDollars: 0,
                              supplierMarginPercent: 0,
                              projectedVolume: 0,
                              projectedScanSpend: 0,
                              status: "draft",
                              projectedRetail: 0,
                              promoSRP: 0,
                              promoMargin: 0,
                              loyaltyPerBottle: 0,
                              loyaltyOffer: "",
                              comment: "",
                              actualUnits: 0,
                              actualSpend: 0,
                              deltaUnits: 0,
                              deltaSpend: 0,
                            })
                          }
                        >
                          <AddIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <DynamicTable
                      columns={columns}
                      data={productData}
                      onRowClick={handleRowClick}
                      stickyHeader={true}
                      maxHeight="calc(100vh - 300px)"
                      enableColumnFiltering={true}
                      showPagination={true}
                      defaultRowsPerPage={15}
                      rowsPerPageOptions={[
                        10,
                        15,
                        25,
                        50,
                        { value: -1, label: "All" },
                      ]}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary">
                  Please select an account to view and manage products
                </Typography>
              </Box>
            )
          ) : (
            // Finance view
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={financeTabValue}
                  onChange={(_, newValue) => setFinanceTabValue(newValue)}
                  aria-label="finance tabs"
                >
                  <Tab label="Pending Approvals" />
                  <Tab label="Approved" />
                  <Tab label="Rejected" />
                </Tabs>
              </Box>

              <TabPanel value={financeTabValue} index={0}>
                {/* Market-level approvals */}
                {Object.entries(marketStatuses)
                  .filter(([_, status]) => status.status === "pending")
                  .map(([marketId, marketStatus]) => {
                    const market = dummyMarkets.find((m) => m.id === marketId);
                    const accountsInMarket = dummyAccounts.filter(
                      (acc) => acc.marketId === marketId
                    );
                    const marketData = data.filter((row) =>
                      accountsInMarket.some((acc) => acc.id === row.accountId)
                    );

                    return (
                      <Paper
                        key={`market-${marketId}`}
                        sx={{ mb: 3, border: "2px solid #e3f2fd" }}
                      >
                        <Box
                          sx={{
                            p: 3,
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            bgcolor: "#f8f9ff",
                            "&:hover": { bgcolor: "#f0f7ff" },
                          }}
                          onClick={() =>
                            setExpandedMarket(
                              expandedMarket === marketId ? null : marketId
                            )
                          }
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="h5"
                                color="primary.main"
                                fontWeight={600}
                              >
                                📍 {market?.name} Market
                              </Typography>
                              <Chip
                                label="MARKET SUBMISSION"
                                color="secondary"
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                mt: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Submitted by:</strong>{" "}
                                {marketStatus.submittedBy}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Submitted on:</strong>{" "}
                                {marketStatus.submittedAt?.toLocaleDateString()}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Accounts:</strong>{" "}
                                {marketStatus.accountCount}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Total Rows:</strong>{" "}
                                {marketStatus.totalRows}
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton size="large">
                            {expandedMarket === marketId ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </Box>

                        <Collapse in={expandedMarket === marketId}>
                          <Box sx={{ p: 3, bgcolor: "white" }}>
                            {/* Market-level approval actions */}
                            <Box
                              sx={{
                                mb: 3,
                                p: 2,
                                bgcolor: "#f8f9ff",
                                borderRadius: 2,
                                border: "1px solid #e3f2fd",
                              }}
                            >
                              <Typography
                                variant="h6"
                                gutterBottom
                                color="primary.main"
                              >
                                Market-Level Review & Approval
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                              >
                                This will approve/reject all accounts and their
                                scan plans within this market.
                              </Typography>
                              <TextField
                                label="Comments for entire market"
                                multiline
                                rows={3}
                                fullWidth
                                value={approvalComments}
                                onChange={(e) =>
                                  setApprovalComments(e.target.value)
                                }
                                sx={{ mb: 2 }}
                              />
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 2,
                                  justifyContent: "flex-end",
                                }}
                              >
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleRejectMarket(marketId)}
                                  size="large"
                                >
                                  Reject Entire Market
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleApproveMarket(marketId)}
                                  size="large"
                                >
                                  Approve Entire Market
                                </Button>
                              </Box>
                            </Box>

                            {/* Collapsible accounts within the market */}
                            <Typography variant="h6" gutterBottom>
                              Accounts in {market?.name} Market
                            </Typography>
                            {accountsInMarket.map((account) => {
                              const accountData = marketData.filter(
                                (row) => row.accountId === account.id
                              );
                              const isAccountExpanded =
                                expandedMarketAccounts.has(account.id);

                              return (
                                <Paper key={account.id} sx={{ mb: 2, ml: 2 }}>
                                  <Box
                                    sx={{
                                      p: 2,
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      "&:hover": { bgcolor: "action.hover" },
                                    }}
                                    onClick={() => {
                                      const newSet = new Set(
                                        expandedMarketAccounts
                                      );
                                      if (isAccountExpanded) {
                                        newSet.delete(account.id);
                                      } else {
                                        newSet.add(account.id);
                                      }
                                      setExpandedMarketAccounts(newSet);
                                    }}
                                  >
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight={500}
                                      >
                                        🏪 {account.name}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {accountData.length} scan plan entries
                                      </Typography>
                                    </Box>
                                    <IconButton size="small">
                                      {isAccountExpanded ? (
                                        <KeyboardArrowUpIcon />
                                      ) : (
                                        <KeyboardArrowDownIcon />
                                      )}
                                    </IconButton>
                                  </Box>

                                  <Collapse in={isAccountExpanded}>
                                    <Box sx={{ p: 2 }}>
                                      {Object.entries(
                                        accountData.reduce((acc, row) => {
                                          if (!acc[row.productId]) {
                                            acc[row.productId] = [];
                                          }
                                          acc[row.productId].push(row);
                                          return acc;
                                        }, {} as Record<string, ScanPlannerRow[]>)
                                      ).map(([productId, productData]) => (
                                        <Box key={productId} sx={{ mb: 2 }}>
                                          <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1 }}
                                          >
                                            📦{" "}
                                            {
                                              dummyProducts.find(
                                                (prod) => prod.id === productId
                                              )?.name
                                            }
                                          </Typography>
                                          <DynamicTable
                                            columns={columns}
                                            data={productData}
                                            onRowClick={handleRowClick}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Collapse>
                                </Paper>
                              );
                            })}
                          </Box>
                        </Collapse>
                      </Paper>
                    );
                  })}

                {/* Individual account-level approvals (only show if not part of a market submission) */}
                {Object.entries(
                  data.reduce((acc, row) => {
                    if (!acc[row.accountId]) {
                      acc[row.accountId] = [];
                    }
                    acc[row.accountId].push(row);
                    return acc;
                  }, {} as Record<string, ScanPlannerRow[]>)
                )
                  .filter(([accountId]) => {
                    const account = dummyAccounts.find(
                      (acc) => acc.id === accountId
                    );
                    const marketStatus = account
                      ? marketStatuses[account.marketId]
                      : null;
                    return (
                      accountStatuses[accountId]?.status === "pending" &&
                      (!marketStatus || marketStatus.status !== "pending")
                    );
                  })
                  .map(([accountId, accountData]) => (
                    <Paper key={accountId} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          p: 2,
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() =>
                          setExpandedAccount(
                            expandedAccount === accountId ? null : accountId
                          )
                        }
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">
                            🏪{" "}
                            {
                              dummyAccounts.find((acc) => acc.id === accountId)
                                ?.name
                            }
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mt: 1,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted by:</strong>{" "}
                              {accountStatuses[accountId]?.submittedBy}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted on:</strong>{" "}
                              {accountStatuses[
                                accountId
                              ]?.submittedAt?.toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <IconButton size="small">
                            {expandedAccount === accountId ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </Box>
                      </Box>

                      <Collapse in={expandedAccount === accountId}>
                        <Box sx={{ p: 2 }}>
                          {Object.entries(
                            accountData.reduce((acc, row) => {
                              if (!acc[row.productId]) {
                                acc[row.productId] = [];
                              }
                              acc[row.productId].push(row);
                              return acc;
                            }, {} as Record<string, ScanPlannerRow[]>)
                          ).map(([productId, productData]) => (
                            <Box key={productId} sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                {
                                  dummyProducts.find(
                                    (prod) => prod.id === productId
                                  )?.name
                                }
                              </Typography>
                              <DynamicTable
                                columns={columns}
                                data={productData}
                                onRowClick={handleRowClick}
                              />
                            </Box>
                          ))}

                          <Box
                            sx={{
                              mt: 3,
                              p: 2,
                              bgcolor: "background.default",
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="subtitle1" gutterBottom>
                              Review & Approval
                            </Typography>
                            <TextField
                              label="Comments"
                              multiline
                              rows={4}
                              fullWidth
                              value={approvalComments}
                              onChange={(e) =>
                                setApprovalComments(e.target.value)
                              }
                              sx={{ mb: 2 }}
                            />
                            <Box
                              sx={{
                                display: "flex",
                                gap: 2,
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => handleReject(accountId)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleApprove(accountId)}
                              >
                                Approve
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </Paper>
                  ))}
              </TabPanel>

              <TabPanel value={financeTabValue} index={1}>
                {/* Market-level approved */}
                {Object.entries(marketStatuses)
                  .filter(([_, status]) => status.status === "approved")
                  .map(([marketId, marketStatus]) => {
                    const market = dummyMarkets.find((m) => m.id === marketId);
                    const accountsInMarket = dummyAccounts.filter(
                      (acc) => acc.marketId === marketId
                    );
                    const marketData = data.filter((row) =>
                      accountsInMarket.some((acc) => acc.id === row.accountId)
                    );

                    return (
                      <Paper
                        key={`approved-market-${marketId}`}
                        sx={{ mb: 3, border: "2px solid #e8f5e8" }}
                      >
                        <Box
                          sx={{
                            p: 3,
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            bgcolor: "#f0f9f0",
                            "&:hover": { bgcolor: "#e8f5e8" },
                          }}
                          onClick={() =>
                            setExpandedMarket(
                              expandedMarket === marketId ? null : marketId
                            )
                          }
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="h5"
                                color="success.main"
                                fontWeight={600}
                              >
                                ✅ {market?.name} Market
                              </Typography>
                              <Chip
                                label="MARKET APPROVED"
                                color="success"
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                mt: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Approved by:</strong>{" "}
                                {marketStatus.approvedBy}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Approved on:</strong>{" "}
                                {marketStatus.approvedAt?.toLocaleDateString()}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Accounts:</strong>{" "}
                                {marketStatus.accountCount}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                <strong>Total Rows:</strong>{" "}
                                {marketStatus.totalRows}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Button
                              startIcon={<PictureAsPdfIcon />}
                              variant="outlined"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportMarketToPDF(
                                  marketId,
                                  marketData,
                                  accountsInMarket
                                );
                              }}
                            >
                              Export Market PDF
                            </Button>
                            <Button
                              startIcon={<TableChartIcon />}
                              variant="outlined"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportMarketToExcel(
                                  marketId,
                                  marketData,
                                  accountsInMarket
                                );
                              }}
                            >
                              Export Market Excel
                            </Button>
                            <IconButton size="large">
                              {expandedMarket === marketId ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>
                          </Box>
                        </Box>

                        <Collapse in={expandedMarket === marketId}>
                          <Box sx={{ p: 3, bgcolor: "white" }}>
                            {/* Market approval info */}
                            {marketStatus.comments && (
                              <Box
                                sx={{
                                  mb: 3,
                                  p: 2,
                                  bgcolor: "#f0f9f0",
                                  borderRadius: 2,
                                  border: "1px solid #e8f5e8",
                                }}
                              >
                                <Typography
                                  variant="h6"
                                  gutterBottom
                                  color="success.main"
                                >
                                  Market Approval Comments
                                </Typography>
                                <Typography variant="body1">
                                  {marketStatus.comments}
                                </Typography>
                              </Box>
                            )}

                            {/* Collapsible accounts within the approved market */}
                            <Typography variant="h6" gutterBottom>
                              Accounts in {market?.name} Market
                            </Typography>
                            {accountsInMarket.map((account) => {
                              const accountData = marketData.filter(
                                (row) => row.accountId === account.id
                              );
                              const isAccountExpanded =
                                expandedMarketAccounts.has(account.id);

                              return (
                                <Paper key={account.id} sx={{ mb: 2, ml: 2 }}>
                                  <Box
                                    sx={{
                                      p: 2,
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      "&:hover": { bgcolor: "action.hover" },
                                    }}
                                    onClick={() => {
                                      const newSet = new Set(
                                        expandedMarketAccounts
                                      );
                                      if (isAccountExpanded) {
                                        newSet.delete(account.id);
                                      } else {
                                        newSet.add(account.id);
                                      }
                                      setExpandedMarketAccounts(newSet);
                                    }}
                                  >
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight={500}
                                      >
                                        🏪 {account.name}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {accountData.length} scan plan entries
                                      </Typography>
                                    </Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Button
                                        startIcon={<PictureAsPdfIcon />}
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportTableToPDF(
                                            account.id,
                                            accountData
                                          );
                                        }}
                                      >
                                        PDF
                                      </Button>
                                      <Button
                                        startIcon={<TableChartIcon />}
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportTableToExcel(
                                            account.id,
                                            accountData
                                          );
                                        }}
                                      >
                                        Excel
                                      </Button>
                                      <IconButton size="small">
                                        {isAccountExpanded ? (
                                          <KeyboardArrowUpIcon />
                                        ) : (
                                          <KeyboardArrowDownIcon />
                                        )}
                                      </IconButton>
                                    </Box>
                                  </Box>

                                  <Collapse in={isAccountExpanded}>
                                    <Box sx={{ p: 2 }}>
                                      {Object.entries(
                                        accountData.reduce((acc, row) => {
                                          if (!acc[row.productId]) {
                                            acc[row.productId] = [];
                                          }
                                          acc[row.productId].push(row);
                                          return acc;
                                        }, {} as Record<string, ScanPlannerRow[]>)
                                      ).map(([productId, productData]) => (
                                        <Box key={productId} sx={{ mb: 2 }}>
                                          <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1 }}
                                          >
                                            📦{" "}
                                            {
                                              dummyProducts.find(
                                                (prod) => prod.id === productId
                                              )?.name
                                            }
                                          </Typography>
                                          <DynamicTable
                                            columns={columns}
                                            data={productData}
                                            onRowClick={handleRowClick}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Collapse>
                                </Paper>
                              );
                            })}
                          </Box>
                        </Collapse>
                      </Paper>
                    );
                  })}

                {/* Individual account-level approved (only show if not part of a market approval) */}
                {Object.entries(
                  data.reduce((acc, row) => {
                    if (!acc[row.accountId]) {
                      acc[row.accountId] = [];
                    }
                    acc[row.accountId].push(row);
                    return acc;
                  }, {} as Record<string, ScanPlannerRow[]>)
                )
                  .filter(([accountId]) => {
                    const account = dummyAccounts.find(
                      (acc) => acc.id === accountId
                    );
                    const marketStatus = account
                      ? marketStatuses[account.marketId]
                      : null;
                    return (
                      accountStatuses[accountId]?.status === "approved" &&
                      (!marketStatus || marketStatus.status !== "approved")
                    );
                  })
                  .map(([accountId, accountData]) => (
                    <Paper key={accountId} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          p: 2,
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() =>
                          setExpandedAccount(
                            expandedAccount === accountId ? null : accountId
                          )
                        }
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">
                            🏪{" "}
                            {
                              dummyAccounts.find((acc) => acc.id === accountId)
                                ?.name
                            }
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mt: 1,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              <strong>Approved by:</strong>{" "}
                              {accountStatuses[accountId]?.approvedBy}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Approved on:</strong>{" "}
                              {accountStatuses[
                                accountId
                              ]?.approvedAt?.toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted by:</strong>{" "}
                              {accountStatuses[accountId]?.submittedBy}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted on:</strong>{" "}
                              {accountStatuses[
                                accountId
                              ]?.submittedAt?.toLocaleDateString()}
                            </Typography>
                            {accountStatuses[accountId]?.comments && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCommentClick(
                                    accountStatuses[accountId]?.comments || ""
                                  );
                                }}
                              >
                                <CommentIcon fontSize="small" color="success" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Button
                            startIcon={<PictureAsPdfIcon />}
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTableToPDF(accountId, accountData);
                            }}
                          >
                            Export PDF
                          </Button>
                          <Button
                            startIcon={<TableChartIcon />}
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTableToExcel(accountId, accountData);
                            }}
                          >
                            Export Excel
                          </Button>
                          <IconButton size="small">
                            {expandedAccount === accountId ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </Box>
                      </Box>

                      <Collapse in={expandedAccount === accountId}>
                        <Box sx={{ p: 2 }}>
                          {Object.entries(
                            accountData.reduce((acc, row) => {
                              if (!acc[row.productId]) {
                                acc[row.productId] = [];
                              }
                              acc[row.productId].push(row);
                              return acc;
                            }, {} as Record<string, ScanPlannerRow[]>)
                          ).map(([productId, productData]) => (
                            <Box key={productId} sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                {
                                  dummyProducts.find(
                                    (prod) => prod.id === productId
                                  )?.name
                                }
                              </Typography>
                              <DynamicTable
                                columns={columns}
                                data={productData}
                                onRowClick={handleRowClick}
                              />
                            </Box>
                          ))}
                          {accountStatuses[accountId]?.comments && (
                            <Box
                              sx={{
                                mt: 3,
                                p: 2,
                                bgcolor: "background.default",
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="subtitle1" gutterBottom>
                                Approval Comments
                              </Typography>
                              <Typography variant="body1">
                                {accountStatuses[accountId]?.comments}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </Paper>
                  ))}
              </TabPanel>

              <TabPanel value={financeTabValue} index={2}>
                {Object.entries(
                  data.reduce((acc, row) => {
                    if (!acc[row.accountId]) {
                      acc[row.accountId] = [];
                    }
                    acc[row.accountId].push(row);
                    return acc;
                  }, {} as Record<string, ScanPlannerRow[]>)
                )
                  .filter(
                    ([accountId]) =>
                      accountStatuses[accountId]?.status === "rejected"
                  )
                  .map(([accountId, accountData]) => (
                    <Paper key={accountId} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          p: 2,
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() =>
                          setExpandedAccount(
                            expandedAccount === accountId ? null : accountId
                          )
                        }
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">
                            {
                              dummyAccounts.find((acc) => acc.id === accountId)
                                ?.name
                            }
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mt: 1,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              <strong>Rejected by:</strong>{" "}
                              {accountStatuses[accountId]?.approvedBy}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Rejected on:</strong>{" "}
                              {accountStatuses[
                                accountId
                              ]?.approvedAt?.toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted by:</strong>{" "}
                              {accountStatuses[accountId]?.submittedBy}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Submitted on:</strong>{" "}
                              {accountStatuses[
                                accountId
                              ]?.submittedAt?.toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Button
                            startIcon={<PictureAsPdfIcon />}
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTableToPDF(accountId, accountData);
                            }}
                          >
                            Export PDF
                          </Button>
                          <Button
                            startIcon={<TableChartIcon />}
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTableToExcel(accountId, accountData);
                            }}
                          >
                            Export Excel
                          </Button>
                          <IconButton size="small">
                            {expandedAccount === accountId ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </Box>
                      </Box>

                      <Collapse in={expandedAccount === accountId}>
                        <Box sx={{ p: 2 }}>
                          {Object.entries(
                            accountData.reduce((acc, row) => {
                              if (!acc[row.productId]) {
                                acc[row.productId] = [];
                              }
                              acc[row.productId].push(row);
                              return acc;
                            }, {} as Record<string, ScanPlannerRow[]>)
                          ).map(([productId, productData]) => (
                            <Box key={productId} sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                {
                                  dummyProducts.find(
                                    (prod) => prod.id === productId
                                  )?.name
                                }
                              </Typography>
                              <DynamicTable
                                columns={columns}
                                data={productData}
                                onRowClick={handleRowClick}
                              />
                            </Box>
                          ))}
                          {accountStatuses[accountId]?.comments && (
                            <Box
                              sx={{
                                mt: 3,
                                p: 2,
                                bgcolor: "background.default",
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="subtitle1" gutterBottom>
                                Rejection Comments
                              </Typography>
                              <Typography variant="body1">
                                {accountStatuses[accountId]?.comments}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </Paper>
                  ))}
              </TabPanel>
            </Box>
          )}
        </Collapse>

        {/* Calendar Dialog */}
        <Dialog
          open={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">Scan Planner Calendar</Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    aria-label="export-range-type"
                    name="export-range-type"
                    value={exportRangeType}
                    onChange={(e) =>
                      setExportRangeType(e.target.value as "current" | "custom")
                    }
                  >
                    <FormControlLabel
                      value="current"
                      control={<Radio />}
                      label="Current Month"
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label="Select Range"
                    />
                  </RadioGroup>
                </FormControl>
                {exportRangeType === "custom" && (
                  <>
                    <FormControl sx={{ minWidth: 120 }} size="small">
                      <InputLabel>Start Month</InputLabel>
                      <Select
                        value={
                          customExportRange.start
                            ? format(customExportRange.start, "yyyy-MM")
                            : ""
                        }
                        onChange={(e) => {
                          const [year, month] = e.target.value
                            .split("-")
                            .map(Number);
                          setCustomExportRange((prev) => ({
                            ...prev,
                            start: new Date(year, month - 1, 1),
                          }));
                        }}
                        label="Start Month"
                      >
                        {availableMonths.map((month) => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120 }} size="small">
                      <InputLabel>End Month</InputLabel>
                      <Select
                        value={
                          customExportRange.end
                            ? format(customExportRange.end, "yyyy-MM")
                            : ""
                        }
                        onChange={(e) => {
                          const [year, month] = e.target.value
                            .split("-")
                            .map(Number);
                          setCustomExportRange((prev) => ({
                            ...prev,
                            end: endOfMonth(new Date(year, month - 1, 1)),
                          }));
                        }}
                        label="End Month"
                      >
                        {availableMonths.map((month) => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}
                <Button
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportPDF}
                  variant="contained"
                  color="primary"
                  disabled={
                    exportRangeType === "custom" &&
                    (!customExportRange.start || !customExportRange.end)
                  }
                >
                  Export PDF
                </Button>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>{renderCalendarContent()}</DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog
          open={!!selectedPlan}
          onClose={() => {
            setSelectedPlan(null);
            setApprovalComments("");
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Review Account Scan Plans</DialogTitle>
          <DialogContent>
            {selectedPlan && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Account:{" "}
                  {
                    dummyAccounts.find((acc) => acc.id === selectedPlan.id)
                      ?.name
                  }
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Submitted by: {accountStatuses[selectedPlan.id]?.submittedBy}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Submitted on:{" "}
                  {accountStatuses[
                    selectedPlan.id
                  ]?.submittedAt?.toLocaleDateString()}
                </Typography>
                <TextField
                  label="Comments"
                  multiline
                  rows={4}
                  fullWidth
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setSelectedPlan(null);
                setApprovalComments("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPlan && handleReject(selectedPlan.id)}
              color="error"
            >
              Reject
            </Button>
            <Button
              onClick={() => selectedPlan && handleApprove(selectedPlan.id)}
              color="success"
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Sidebar */}
        <QualSidebar
          open={!!selectedRowForSidebar}
          onClose={() => {
            setSelectedRowForSidebar(null);
            setSelectedDataState(null);
            setHasChanges(false);
          }}
          title="Edit Scan Planner Entry"
          width="600px"
          footerButtons={[
            {
              label: "Cancel",
              onClick: () => {
                setSelectedRowForSidebar(null);
                setSelectedDataState(null);
                setHasChanges(false);
              },
              variant: "outlined",
            },
            {
              label: "Save Changes",
              onClick: handleSidebarSave,
              variant: "contained",
              disabled: !hasChanges,
            },
          ]}
        >
          {selectedDataState && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <DatePicker
                    label="Week Of"
                    value={selectedDataState.weekOf}
                    onChange={(date) => handleFieldChange("weekOf", date)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Scan Amount"
                    type="number"
                    value={selectedDataState.scanLevel1}
                    onChange={(e) =>
                      handleFieldChange("scanLevel1", Number(e.target.value))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="QD"
                    type="number"
                    value={selectedDataState.qd}
                    onChange={(e) =>
                      handleFieldChange("qd", Number(e.target.value))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="DA"
                    type="number"
                    value={selectedDataState.da}
                    onChange={(e) =>
                      handleFieldChange("da", Number(e.target.value))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Loyalty"
                    type="number"
                    value={selectedDataState.loyalty}
                    onChange={(e) =>
                      handleFieldChange("loyalty", Number(e.target.value))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Retail Margin (%)"
                    type="number"
                    value={selectedDataState.retailMargin}
                    onChange={(e) =>
                      handleFieldChange("retailMargin", Number(e.target.value))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Projected Retail"
                    type="number"
                    value={selectedDataState.bottleCostWithScan}
                    onChange={(e) =>
                      handleFieldChange(
                        "bottleCostWithScan",
                        Number(e.target.value)
                      )
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Supplier Margin ($)"
                    type="number"
                    value={selectedDataState.supplierMarginDollars}
                    onChange={(e) =>
                      handleFieldChange(
                        "supplierMarginDollars",
                        Number(e.target.value)
                      )
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Supplier Margin (%)"
                    type="number"
                    value={selectedDataState.supplierMarginPercent}
                    onChange={(e) =>
                      handleFieldChange(
                        "supplierMarginPercent",
                        Number(e.target.value)
                      )
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Projected Volume"
                    type="number"
                    value={selectedDataState.projectedVolume}
                    onChange={(e) =>
                      handleFieldChange(
                        "projectedVolume",
                        Number(e.target.value)
                      )
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Projected Scan Spend"
                    type="number"
                    value={selectedDataState.projectedScanSpend}
                    onChange={(e) =>
                      handleFieldChange(
                        "projectedScanSpend",
                        Number(e.target.value)
                      )
                    }
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </QualSidebar>

        {/* Comment Dialog */}
        <Dialog
          open={commentDialogOpen}
          onClose={() => setCommentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Review Comments</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mt: 2 }}>
              {selectedComment}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCommentDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Add Account Dialog */}
        <Dialog
          open={addAccountDialogOpen}
          onClose={() => setAddAccountDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Add New Account</DialogTitle>
          <DialogContent>
            <TextField
              label="Account Name"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} variant="contained">
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Product Dialog */}
        <Dialog
          open={addProductDialogOpen}
          onClose={() => setAddProductDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Add New Product</DialogTitle>
          <DialogContent>
            <TextField
              label="Product Name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
            {!selectedAccount && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="product-account-select-label">
                  Account
                </InputLabel>
                <Select
                  labelId="product-account-select-label"
                  value={newProductAccountId}
                  onChange={(e) => setNewProductAccountId(e.target.value)}
                  label="Account"
                >
                  {dummyAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} variant="contained">
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
};
