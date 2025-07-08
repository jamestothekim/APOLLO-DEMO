import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";

// Interface for the data rows
interface AuditLogData {
  audit_id: number;
  user_id: number | null;
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  action_type: string;
  action: string;
  status: string;
  details: any; // Can be an object or string
  ip_address: string | null;
  action_timestamp: string;
  created_at: string;
  id: number; // Mapped from audit_id for DynamicTable's getRowId
}

export const AuditLogs = () => {
  const [data, setData] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [dialogDetails, setDialogDetails] = useState<any>(null);
  // const [error, setError] = useState<string | null>(null); // Optional: for error handling display

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // setError(null);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/audit/logs`, // Fetch all logs without limit
          {
            headers: {
              "Content-Type": "application/json",
              // Authorization header might be needed if verifyToken is strict.
              // Assuming it's handled by a global interceptor or session cookies.
            },
          }
        );

        // The API returns { logs: [], pagination: {} }
        const transformedData = response.data.logs.map((row: any) => ({
          ...row,
          id: row.audit_id, // Map audit_id to id for DynamicTable
        }));

        setData(transformedData);
      } catch (err) {
        console.error("Error fetching audit logs:", err);
        // setError("Failed to fetch audit logs.");
        // Optionally, you could set an error state and display an Alert message
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const columns: Column[] = [
    {
      key: "user_name", // Custom key for derived value; actual data comes from row object
      header: "User",
      width: 200,
      render: (_, row: any) => {
        if (row.user_first_name && row.user_last_name) {
          return `${row.user_first_name} ${row.user_last_name}`;
        }
        if (row.user_email) return row.user_email;
        if (row.user_id) return `User ID: ${row.user_id}`; // Fallback if name/email are null
        return "System"; // For actions not tied to a specific user
      },
      sortable: true,
      // Define sortAccessor to enable sorting on this derived/combined field
      sortAccessor: (row: any) =>
        `${row.user_last_name || ""} ${row.user_first_name || ""} ${
          row.user_email || ""
        } ${row.user_id || ""}`.trim(),
      filterable: true, // Assuming DynamicTable can filter based on rendered content or needs custom filter logic
    },
    {
      key: "action_type",
      header: "Action Type",
      width: 180,
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
      sortable: true,
      filterable: true,
    },
    {
      key: "action",
      header: "Action",
      width: 380,
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
      sortable: true,
      filterable: true,
    },
    {
      key: "status",
      header: "Status",
      width: 110,
      align: "center",
      render: (
        value // value is row.status
      ) => (
        <Typography
          component="span" // Use span to avoid block layout issues in a table cell
          variant="body2" // Consistent text styling
          sx={{
            fontWeight: "medium",
            color:
              value === "SUCCESS"
                ? "success.main"
                : value === "FAILURE"
                ? "error.main"
                : "text.primary",
            // Optional: Add a background chip-like style
            // padding: '2px 8px',
            // borderRadius: '16px',
            // backgroundColor: value === "SUCCESS" ? 'success.light' : value === "FAILURE" ? 'error.light' : 'grey.200',
            // color: value === "SUCCESS" ? 'success.dark' : value === "FAILURE" ? 'error.dark' : 'text.primary',
          }}
        >
          {String(value)}
        </Typography>
      ),
      sortable: true,
      filterable: true,
    },
    {
      key: "action_timestamp",
      header: "Action Timestamp",
      width: 220,
      render: (value) => formatDate(value as string),
      sortable: true,
    },
    {
      key: "ip_address",
      header: "IP Address",
      width: 150,
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
      sortable: true,
      filterable: true,
    },
    {
      key: "details",
      header: "Details",
      width: 100,
      render: (_, row) => (
        <IconButton
          aria-label="View Details"
          size="small"
          onClick={() => {
            setDialogDetails(row.details);
            setDetailsDialogOpen(true);
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
      sx: {
        textAlign: "center",
      },
    },
    {
      key: "created_at",
      header: "Logged At",
      width: 220,
      render: (value) => formatDate(value as string),
      sortable: true,
    },
  ];

  if (loading) {
    // The onComplete prop for LoadingProgress is not used in rateMaster, so omitting here too.
    return <LoadingProgress onComplete={() => {}} />;
  }

  // Optional: Display error message using MUI Alert if setError state was used
  // if (error) {
  //   return <Alert severity="error">{error}</Alert>;
  // }

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        p: 0 /* Matches rateMaster style */,
      }}
    >
      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, pr: 5, position: "relative" }}>
          Details
          <IconButton
            aria-label="close"
            onClick={() => setDetailsDialogOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "monospace",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              p: 1,
            }}
          >
            {dialogDetails === null || dialogDetails === undefined
              ? "No details."
              : typeof dialogDetails === "object"
              ? JSON.stringify(dialogDetails, null, 2)
              : String(dialogDetails)}
          </Box>
        </DialogContent>
      </Dialog>
      {/* Optionally, add a title for the page if desired, similar to how UserMaster's sidebar has a title */}
      {/* <Typography variant="h5" sx={{ mb: 2, px: 3, pt: 2 }}>User Audit Logs</Typography> */}
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row: AuditLogData) => String(row.id)} // id is already mapped from audit_id
        // No onRowClick, as this is a read-only table.
        rowsPerPageOptions={[25, 50, 100, 200, { value: -1, label: "All" }]} // Added "All" option
        defaultRowsPerPage={100} // Increased default from 50 to 100
        enableColumnFiltering
        // Other DynamicTable props like enableSorting, enablePagination are likely true by default
        // or can be added if needed.
      />
    </Box>
  );
};

// If this component is intended to be the default export for routing purposes:
// export default AuditLogs;
// For now, exporting as a named const to match RateMaster.tsx structure.
