import {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import {
  Box,
  TextField,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import MenuItem from "@mui/material/MenuItem";
import { useUser } from "../../userContext";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";
import {
  Publish as PublishIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Example of how to access market codes from user context:
// const { user } = useUser();
// const marketCodes = user?.user_access?.Markets?.map(market => market.market_coding) || [];
// This will give you an array of market codes like ['USAAK1', 'USAAZ1', etc.]

interface MarketData {
  market_name: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  settings?: {
    managed_by?: string;
  };
  forecast_status: string;
  forecast_generation_month_date: string;
}

// Define the interface for the exposed methods
export interface MarketMasterHandle {
  getMarketData: () => MarketData[];
}

export const MarketMaster = forwardRef<MarketMasterHandle>((_props, ref) => {
  const [data, setData] = useState<MarketData[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editedMarket, setEditedMarket] = useState<MarketData | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(true);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishComment, setUnpublishComment] = useState("");
  const [unpublishConfirmation, setUnpublishConfirmation] = useState("");
  const [unpublishLoading, setUnpublishLoading] = useState(false);
  const [unpublishError, setUnpublishError] = useState("");

  // Add publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishComment, setPublishComment] = useState("");
  const [publishCommentError, setPublishCommentError] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishConfirmationText, setPublishConfirmationText] = useState("");
  const [publishConfirmationError, setPublishConfirmationError] =
    useState(false);

  // Add unpublish all dialog state
  const [unpublishAllDialogOpen, setUnpublishAllDialogOpen] = useState(false);
  const [unpublishAllComment, setUnpublishAllComment] = useState("");
  const [unpublishAllCommentError, setUnpublishAllCommentError] =
    useState(false);
  const [isUnpublishingAll, setIsUnpublishingAll] = useState(false);
  const [unpublishAllConfirmationText, setUnpublishAllConfirmationText] =
    useState("");
  const [unpublishAllConfirmationError, setUnpublishAllConfirmationError] =
    useState(false);

  // Add user context
  const { user } = useUser();

  // Get market codes from user access
  const userMarketCodes =
    user?.user_access?.Markets?.map((market) => market.market_code) || [];
  console.log("User Market Codes:", userMarketCodes);

  // Parse user_access to check permissions
  const userAccess = useMemo(() => {
    if (!user?.user_access) return null;
    if (typeof user.user_access === "string") {
      try {
        const parsed = JSON.parse(user.user_access);
        return typeof parsed === "object" && parsed !== null ? parsed : null;
      } catch (error) {
        console.error("Failed to parse user_access:", error);
        return null;
      }
    }
    return typeof user.user_access === "object" && user.user_access !== null
      ? user.user_access
      : null;
  }, [user?.user_access]);

  // Check if user can publish
  const canPublish = user?.role === "Finance" && userAccess?.Admin === true;

  // Check market statuses to determine button states
  const getMarketStatuses = () => {
    if (!data || data.length === 0) {
      return {
        allReview: false,
        anyDraft: false,
        anyReview: false,
        hasData: false,
      };
    }

    const statuses = data.map((market) =>
      market.forecast_status?.toLowerCase()
    );
    const allReview = statuses.every((status) => status === "review");
    const anyDraft = statuses.some((status) => status === "draft");
    const anyReview = statuses.some((status) => status === "review");

    return { allReview, anyDraft, anyReview, hasData: true };
  };

  const { anyDraft, anyReview, hasData } = getMarketStatuses();

  // Button enable/disable logic
  const publishAllEnabled = anyDraft; // Enable if there are any draft markets
  const unpublishAllEnabled = anyReview; // Enable if there are any review markets

  // Add publish handlers
  const handlePublishAll = () => {
    setPublishComment("");
    setPublishCommentError(false);
    setPublishConfirmationText("");
    setPublishConfirmationError(false);
    setIsPublishing(false);
    setPublishDialogOpen(true);
  };

  const handleUnpublishAll = () => {
    setUnpublishAllComment("");
    setUnpublishAllCommentError(false);
    setUnpublishAllConfirmationText("");
    setUnpublishAllConfirmationError(false);
    setIsUnpublishingAll(false);
    setUnpublishAllDialogOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/market-with-status`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Filter markets based on user's access
        const filteredData = response.data.filter((market: any) =>
          userMarketCodes.includes(market.market_code)
        );

        console.log("Filtered Market Data with Status:", filteredData);

        const processedData = filteredData.map((row: MarketData) => ({
          ...row,
          settings:
            typeof row.settings === "string"
              ? JSON.parse(row.settings)
              : row.settings || { managed_by: "Not Set" },
        }));
        setData(processedData);
      } catch (error) {
        console.error("Error fetching market data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setEditedMarket(selectedMarket);
  }, [selectedMarket]);

  const handleManagedByChange = (value: string) => {
    if (!editedMarket) return;
    setEditedMarket({
      ...editedMarket,
      settings: { ...editedMarket.settings, managed_by: value },
    });
  };

  const handleSave = async () => {
    if (!editedMarket) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/market-master/managed-by`,
        {
          market_code: editedMarket.market_code,
          managed_by: editedMarket.settings?.managed_by,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      const updatedData = data.map((market) =>
        market.market_id === editedMarket.market_id ? editedMarket : market
      );
      setData(updatedData);
      setSelectedMarket(editedMarket);
      setSidebarOpen(false);
      showSnackbar("Market settings updated successfully", "success");
    } catch (error) {
      console.error("Error updating managed by:", error);
      showSnackbar("Failed to update market settings", "error");
    }
  };

  const handleClose = () => {
    setEditedMarket(selectedMarket);
    setSidebarOpen(false);
  };

  const handleUnpublish = async () => {
    if (!editedMarket) return;
    setUnpublishLoading(true);
    setUnpublishError("");

    // Format the forecast_generation_month_date to YYYY-MM-DD with day as 01
    let formattedForecastPeriod;
    try {
      const rawDate = editedMarket.forecast_generation_month_date;
      const date = new Date(rawDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      formattedForecastPeriod = `${year}-${month}-01`;
    } catch (error) {
      setUnpublishError("Failed to format forecast generation month date.");
      setUnpublishLoading(false);
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/unpublish-market-forecast`,
        {
          market_id: editedMarket.market_id,
          forecast_period: formattedForecastPeriod,
          user: user?.email,
          reason: unpublishComment,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setUnpublishDialogOpen(false);
      setUnpublishComment("");
      setUnpublishConfirmation("");
      setSnackbarMessage("Market forecast unpublished successfully.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Update local state to reflect the unpublished status (back to Draft)
      setData((prevData) =>
        prevData.map((market) =>
          market.market_id === editedMarket.market_id
            ? { ...market, forecast_status: "draft" }
            : market
        )
      );

      // Update the selected and edited market states as well
      const updatedMarket = { ...editedMarket, forecast_status: "draft" };
      setSelectedMarket(updatedMarket);
      setEditedMarket(updatedMarket);
    } catch (error) {
      setUnpublishError(
        axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to unpublish market forecast."
      );
    } finally {
      setUnpublishLoading(false);
    }
  };

  const handleClosePublishDialog = () => {
    if (isPublishing) return;
    setPublishDialogOpen(false);
  };

  const handleConfirmPublish = async () => {
    let hasError = false;
    if (!publishComment.trim()) {
      setPublishCommentError(true);
      hasError = true;
    }
    if (publishConfirmationText !== "PUBLISH") {
      setPublishConfirmationError(true);
      hasError = true;
    }

    if (hasError) return;

    setPublishCommentError(false);
    setPublishConfirmationError(false);
    setIsPublishing(true);

    if (!user || !userAccess || !userAccess.Division) {
      showSnackbar("User information or Division not available.", "error");
      setIsPublishing(false);
      return;
    }

    const isCorporate = userAccess.Division === "Corporate";
    const divisionParam = isCorporate ? "corporate" : userAccess.Division;
    const publicationStatus = isCorporate ? "consensus" : "review";
    const userId = user.id;

    // Get forecast_generation_month_date from market data
    let forecastGenerationMonth;
    try {
      if (data && data.length > 0) {
        const rawDate = data[0].forecast_generation_month_date;
        // Format to YYYY-MM-DD with day as 01
        const date = new Date(rawDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        forecastGenerationMonth = `${year}-${month}-01`;
      } else {
        throw new Error("No market data available");
      }
    } catch (error) {
      showSnackbar(
        "Failed to get forecast generation month from market data.",
        "error"
      );
      setIsPublishing(false);
      return;
    }

    try {
      console.log(
        `[MARKET PUBLISH] Attempting to publish forecast for ${divisionParam} to ${publicationStatus} status with month ${forecastGenerationMonth}`
      );

      const publishPayload = {
        forecast_generation_month: forecastGenerationMonth,
        user_id: userId,
        division_name: divisionParam,
        publication_status: publicationStatus,
        comment: publishComment.trim(),
      };

      console.log("[MARKET PUBLISH] Payload being sent:", publishPayload);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/publish-forecast`,
        publishPayload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        const successMessage = isCorporate
          ? "Successfully promoted all divisions to consensus status"
          : `Successfully published ${userAccess.Division} forecast to "Review" status for review`;

        showSnackbar(successMessage, "success");
        setPublishDialogOpen(false);

        // Update local state to reflect all markets are now in Review status
        setData((prevData) =>
          prevData.map((market) => ({
            ...market,
            forecast_status: "review",
          }))
        );

        // Update selected and edited market states if they exist
        if (selectedMarket) {
          const updatedSelectedMarket = {
            ...selectedMarket,
            forecast_status: "review",
          };
          setSelectedMarket(updatedSelectedMarket);
        }
        if (editedMarket) {
          const updatedEditedMarket = {
            ...editedMarket,
            forecast_status: "review",
          };
          setEditedMarket(updatedEditedMarket);
        }
      } else {
        throw new Error(response.data.message || "Publishing failed");
      }
    } catch (error) {
      console.error("[MARKET PUBLISH] Publish failed:", {
        error: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
          ? error.message
          : "Unknown error occurred",
        division: divisionParam,
        status: publicationStatus,
        userId,
        forecastMonth: forecastGenerationMonth,
        userDivision: userAccess.Division,
      });

      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : "An unexpected error occurred during publishing.";

      showSnackbar(
        `Publish failed: ${errorMessage}. Please check console for details.`,
        "error"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCloseUnpublishAllDialog = () => {
    if (isUnpublishingAll) return;
    setUnpublishAllDialogOpen(false);
  };

  const handleConfirmUnpublishAll = async () => {
    let hasError = false;
    if (!unpublishAllComment.trim()) {
      setUnpublishAllCommentError(true);
      hasError = true;
    }
    if (unpublishAllConfirmationText !== "UNPUBLISH") {
      setUnpublishAllConfirmationError(true);
      hasError = true;
    }

    if (hasError) return;

    setUnpublishAllCommentError(false);
    setUnpublishAllConfirmationError(false);
    setIsUnpublishingAll(true);

    if (!user || !userAccess || !userAccess.Division) {
      showSnackbar("User information or Division not available.", "error");
      setIsUnpublishingAll(false);
      return;
    }

    const divisionParam =
      userAccess.Division === "Corporate" ? "corporate" : userAccess.Division;
    const userId = user.id;

    // Get forecast_generation_month_date from market data
    let forecastGenerationMonth;
    try {
      if (data && data.length > 0) {
        const rawDate = data[0].forecast_generation_month_date;
        // Format to YYYY-MM-DD with day as 01
        const date = new Date(rawDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        forecastGenerationMonth = `${year}-${month}-01`;
      } else {
        throw new Error("No market data available");
      }
    } catch (error) {
      showSnackbar(
        "Failed to get forecast generation month from market data.",
        "error"
      );
      setIsUnpublishingAll(false);
      return;
    }

    try {
      console.log(
        `[UNPUBLISH ALL] Attempting to unpublish all forecasts for ${divisionParam} division for month ${forecastGenerationMonth}`
      );

      const unpublishPayload = {
        division: divisionParam,
        forecast_period: forecastGenerationMonth,
        user: user.email,
        reason: unpublishAllComment.trim(),
      };

      console.log("[UNPUBLISH ALL] Payload being sent:", unpublishPayload);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/unpublish-division-forecasts`,
        unpublishPayload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        const successMessage = `Successfully unpublished all ${userAccess.Division} division forecasts`;

        showSnackbar(successMessage, "success");
        setUnpublishAllDialogOpen(false);

        // Update local state to reflect all markets are now back to Draft status
        setData((prevData) =>
          prevData.map((market) => ({
            ...market,
            forecast_status: "draft",
          }))
        );

        // Update selected and edited market states if they exist
        if (selectedMarket) {
          const updatedSelectedMarket = {
            ...selectedMarket,
            forecast_status: "draft",
          };
          setSelectedMarket(updatedSelectedMarket);
        }
        if (editedMarket) {
          const updatedEditedMarket = {
            ...editedMarket,
            forecast_status: "draft",
          };
          setEditedMarket(updatedEditedMarket);
        }
      } else {
        throw new Error(response.data.message || "Unpublishing failed");
      }
    } catch (error) {
      console.error("[UNPUBLISH ALL] Unpublish failed:", {
        error: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
          ? error.message
          : "Unknown error occurred",
        division: divisionParam,
        userId,
        forecastMonth: forecastGenerationMonth,
        userDivision: userAccess.Division,
      });

      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : "An unexpected error occurred during unpublishing.";

      showSnackbar(
        `Unpublish failed: ${errorMessage}. Please check console for details.`,
        "error"
      );
    } finally {
      setIsUnpublishingAll(false);
    }
  };

  const footerButtons = [
    {
      label: "Cancel",
      onClick: handleClose,
      variant: "outlined" as const,
    },
    {
      label: "Save Changes",
      onClick: handleSave,
      variant: "contained" as const,
      disabled:
        JSON.stringify(editedMarket?.settings) ===
        JSON.stringify(selectedMarket?.settings),
    },
  ];

  // Add Unpublish button if status is Review
  if (editedMarket?.forecast_status?.toLowerCase() === "review") {
    footerButtons.push({
      label: "UNPUBLISH",
      onClick: async () => {
        setUnpublishDialogOpen(true);
      },
      variant: "contained" as const,
      disabled: unpublishLoading,
    });
  }

  const columns: Column[] = [
    {
      key: "market_name",
      header: "Market Name",
      width: 250,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "market_code",
      header: "Market Code",
      width: 150,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "market_coding",
      header: "Market Coding",
      width: 150,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "market_id",
      header: "Market ID",
      width: 180,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "settings.managed_by",
      header: "Managed By",
      width: 150,
      render: (_value, row) => row.settings?.managed_by || "Not Set",
      sortable: true,
      filterable: true,
      sortAccessor: (row) => row.settings?.managed_by,
    },
    {
      key: "forecast_status",
      header: "Forecast Status",
      width: 150,
      render: (value) => {
        if (!value) return "-";
        // Convert to Proper Case (e.g., 'Draft', 'Published')
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      },
      sortable: true,
      filterable: true,
    },
  ];

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Expose the getMarketData method via ref
  useImperativeHandle(
    ref,
    () => {
      return {
        getMarketData: () => {
          return data;
        },
      };
    },
    [data]
  );

  if (loading) {
    return <LoadingProgress onComplete={() => {}} dataReady={!loading} />;
  }

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.market_id}
        defaultRowsPerPage={20}
        rowsPerPageOptions={[20, 50, 100]}
        onRowClick={(row) => {
          setSelectedMarket(row);
          setSidebarOpen(true);
        }}
        enableColumnFiltering
      />

      {/* Publish and Unpublish Buttons in lower left corner */}
      {canPublish && hasData && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            display: "flex",
            gap: 1,
            zIndex: 1,
          }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<PublishIcon />}
            onClick={handlePublishAll}
            color="primary"
            disabled={!publishAllEnabled || isPublishing}
            sx={{
              textTransform: "none",
              borderRadius: "3px",
            }}
          >
            PUBLISH ALL
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CloseIcon />}
            onClick={handleUnpublishAll}
            color="error"
            disabled={!unpublishAllEnabled || isPublishing || isUnpublishingAll}
            sx={{
              textTransform: "none",
              borderRadius: "3px",
            }}
          >
            UNPUBLISH ALL
          </Button>
        </Box>
      )}

      <QualSidebar
        open={sidebarOpen}
        onClose={handleClose}
        title="Edit Market Settings"
        width="400px"
        footerButtons={footerButtons}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Market Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Market Name"
                  value={editedMarket?.market_name || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market Code"
                  value={editedMarket?.market_code || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market Coding"
                  value={editedMarket?.market_coding || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market ID"
                  value={editedMarket?.market_id || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Forecast Status"
                  value={
                    editedMarket?.forecast_status
                      ? editedMarket.forecast_status.charAt(0).toUpperCase() +
                        editedMarket.forecast_status.slice(1).toLowerCase()
                      : "-"
                  }
                  disabled
                />
                <TextField
                  select
                  fullWidth
                  label="Managed By"
                  value={editedMarket?.settings?.managed_by || ""}
                  onChange={(e) => handleManagedByChange(e.target.value)}
                >
                  <MenuItem value="Market">Market</MenuItem>
                  <MenuItem value="Customer">Customer</MenuItem>
                </TextField>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </QualSidebar>

      {/* Unpublish Dialog */}
      <Dialog
        open={unpublishDialogOpen}
        onClose={() => {
          if (!unpublishLoading) setUnpublishDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={unpublishLoading}
      >
        <DialogTitle color="error">Unpublish Market Forecast</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            To unpublish this market forecast, please provide a reason and type{" "}
            <b>UNPUBLISH</b> below to confirm.
          </Typography>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Reason (Required)"
            type="text"
            fullWidth
            variant="outlined"
            value={unpublishComment}
            onChange={(e) => setUnpublishComment(e.target.value)}
            disabled={unpublishLoading}
            multiline
            rows={3}
            error={!unpublishComment.trim() && unpublishDialogOpen}
            helperText={
              !unpublishComment.trim() && unpublishDialogOpen
                ? "Reason is required."
                : ""
            }
          />
          <TextField
            required
            margin="dense"
            label="To unpublish, type 'UNPUBLISH'"
            type="text"
            fullWidth
            variant="outlined"
            value={unpublishConfirmation}
            onChange={(e) => setUnpublishConfirmation(e.target.value)}
            disabled={unpublishLoading}
            error={
              unpublishDialogOpen &&
              unpublishConfirmation.trim() !== "UNPUBLISH"
            }
            helperText={
              unpublishDialogOpen &&
              unpublishConfirmation.trim() !== "UNPUBLISH"
                ? "Confirmation text does not match."
                : ""
            }
            sx={{ mt: 2 }}
          />
          {unpublishError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {unpublishError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: "16px 24px" }}>
          <Button
            onClick={() => setUnpublishDialogOpen(false)}
            disabled={unpublishLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnpublish}
            variant="contained"
            color="error"
            disabled={
              unpublishLoading ||
              !unpublishComment.trim() ||
              unpublishConfirmation.trim() !== "UNPUBLISH"
            }
          >
            {unpublishLoading ? "Unpublishing..." : "Unpublish"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog
        open={publishDialogOpen}
        onClose={handleClosePublishDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isPublishing}
      >
        <DialogTitle color="primary">Publish Forecast</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            To publish this forecast, please provide a comment and type{" "}
            <b>PUBLISH</b> below to confirm.
          </Typography>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Comment (Required)"
            type="text"
            fullWidth
            variant="outlined"
            value={publishComment}
            onChange={(e) => setPublishComment(e.target.value)}
            disabled={isPublishing}
            multiline
            rows={3}
            error={publishCommentError && publishDialogOpen}
            helperText={
              publishCommentError && publishDialogOpen
                ? "Comment is required."
                : ""
            }
          />
          <TextField
            required
            margin="dense"
            label="To publish, type 'PUBLISH'"
            type="text"
            fullWidth
            variant="outlined"
            value={publishConfirmationText}
            onChange={(e) => setPublishConfirmationText(e.target.value)}
            disabled={isPublishing}
            error={
              publishDialogOpen && publishConfirmationText.trim() !== "PUBLISH"
            }
            helperText={
              publishDialogOpen && publishConfirmationText.trim() !== "PUBLISH"
                ? "Confirmation text does not match."
                : ""
            }
            sx={{ mt: 2 }}
          />
          {publishConfirmationError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {publishConfirmationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: "16px 24px" }}>
          <Button onClick={handleClosePublishDialog} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            color="primary"
            disabled={
              isPublishing ||
              !publishComment.trim() ||
              publishConfirmationText.trim() !== "PUBLISH"
            }
          >
            {isPublishing ? <CircularProgress size={20} /> : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unpublish All Confirmation Dialog */}
      <Dialog
        open={unpublishAllDialogOpen}
        onClose={handleCloseUnpublishAllDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isUnpublishingAll}
      >
        <DialogTitle color="error">
          Unpublish All Division Forecasts
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            By selecting "Unpublish", you will unpublish all forecasts for the{" "}
            <strong>{userAccess?.Division ?? "selected"}</strong> division.
            Please provide a reason and type <b>UNPUBLISH</b> below to confirm.
          </Typography>

          <TextField
            autoFocus
            required
            margin="dense"
            label="Reason (Required)"
            type="text"
            fullWidth
            variant="outlined"
            value={unpublishAllComment}
            onChange={(e) => {
              setUnpublishAllComment(e.target.value);
              if (e.target.value.trim()) {
                setUnpublishAllCommentError(false);
              }
            }}
            error={unpublishAllCommentError}
            helperText={unpublishAllCommentError ? "Reason is required." : ""}
            disabled={isUnpublishingAll}
            multiline
            rows={3}
          />

          <TextField
            required
            margin="dense"
            label="To unpublish, type 'UNPUBLISH'"
            type="text"
            fullWidth
            variant="outlined"
            value={unpublishAllConfirmationText}
            onChange={(e) => {
              setUnpublishAllConfirmationText(e.target.value);
              if (e.target.value === "UNPUBLISH") {
                setUnpublishAllConfirmationError(false);
              } else if (e.target.value.trim() !== "") {
                setUnpublishAllConfirmationError(true);
              } else {
                setUnpublishAllConfirmationError(false);
              }
            }}
            onBlur={() => {
              if (
                unpublishAllConfirmationText.trim() &&
                unpublishAllConfirmationText !== "UNPUBLISH"
              ) {
                setUnpublishAllConfirmationError(true);
              }
            }}
            error={unpublishAllConfirmationError}
            helperText={
              unpublishAllConfirmationError
                ? "Confirmation text does not match."
                : ""
            }
            disabled={isUnpublishingAll}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: "16px 24px" }}>
          <Button
            onClick={handleCloseUnpublishAllDialog}
            disabled={isUnpublishingAll}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUnpublishAll}
            variant="contained"
            color="error"
            disabled={
              isUnpublishingAll ||
              unpublishAllCommentError ||
              !unpublishAllComment.trim() ||
              unpublishAllConfirmationText !== "UNPUBLISH" ||
              unpublishAllConfirmationError
            }
            startIcon={
              isUnpublishingAll ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CloseIcon />
              )
            }
          >
            {isUnpublishingAll ? "Unpublishing..." : "Unpublish"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
});
