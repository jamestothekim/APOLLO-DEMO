import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export const Toolbox: React.FC = () => {
  const handleUndo = () => {
    console.log("Toolbox");
  };

  const handleColumns = () => {
    console.log("Columns");
  };

  const handleExport = () => {
    console.log("Export CSV");
  };

  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UndoIcon />}
          onClick={handleUndo}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          Undo
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ViewColumnIcon />}
          onClick={handleColumns}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          +/- Columns
        </Button>
      </Box>

      <Button
        variant="contained"
        size="small"
        startIcon={<FileDownloadIcon />}
        onClick={handleExport}
        sx={{
          textTransform: "none",
          borderRadius: "8px",
        }}
      >
        Export CSV
      </Button>
    </Box>
  );
};
