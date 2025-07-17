import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

interface ChainToolboxProps {
  onUndo: () => void;
  onGuidance: () => void;
  onExport: () => void;
  canUndo?: boolean;
}

/**
 * Minimal toolbox for Chain Planner showing Undo and Guidance buttons.
 * Styling mirrors the Volume Forecast toolbox for UI consistency.
 */
export const ChainToolbox: React.FC<ChainToolboxProps> = ({
  onUndo,
  onGuidance,
  onExport,
  canUndo = false,
}) => {
  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        {/* Guidance Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ViewColumnIcon />}
          onClick={onGuidance}
          sx={{ textTransform: "none", borderRadius: "8px" }}
        >
          Guidance
        </Button>

        {/* Undo Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<UndoIcon />}
          onClick={onUndo}
          disabled={!canUndo}
          sx={{ textTransform: "none", borderRadius: "8px" }}
        >
          Undo
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        {/* Export Button */}
        <Button
          variant="contained"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={onExport}
          sx={{ textTransform: "none", borderRadius: "8px" }}
        >
          Export
        </Button>
      </Box>
    </Box>
  );
};

export default ChainToolbox;
