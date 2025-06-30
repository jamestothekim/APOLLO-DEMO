import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ScanGuidanceDialog, { GuidanceOption } from "./scanGuidance";

interface ScanToolboxProps {
  availableOptions: GuidanceOption[];
  selectedKeys: string[];
  onApply: (keys: string[]) => void;
}

const ScanToolbox: React.FC<ScanToolboxProps> = ({
  availableOptions,
  selectedKeys,
  onApply,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ViewColumnIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ textTransform: "none", borderRadius: 2 }}
      >
        Guidance
      </Button>
      <ScanGuidanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        availableOptions={availableOptions}
        selectedKeys={selectedKeys}
        onApply={(keys) => {
          onApply(keys);
          setDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default ScanToolbox;
