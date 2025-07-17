import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

interface MarketingToolboxProps {
  onExport?: () => void;
}

const MarketingToolbox: React.FC<MarketingToolboxProps> = ({ onExport }) => {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<UndoIcon />}
        onClick={() => console.log("Undo clicked")}
        sx={{ textTransform: "none", borderRadius: "8px" }}
      >
        Undo
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ViewColumnIcon />}
        onClick={() => console.log("Guidance clicked")}
        sx={{ textTransform: "none", borderRadius: "8px" }}
      >
        Guidance
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Button
        variant="outlined"
        size="small"
        startIcon={<FileDownloadIcon />}
        onClick={onExport}
        sx={{ textTransform: "none", borderRadius: "8px" }}
      >
        Export to CSV
      </Button>
    </Box>
  );
};

export default MarketingToolbox;
