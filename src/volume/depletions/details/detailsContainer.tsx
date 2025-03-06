import { useState } from "react";
import { Dialog, DialogContent, IconButton, Box, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DepletionDetails } from "./depletionDetails";
import { PremiseDetails } from "./premiseDetails";

interface DetailsContainerProps {
  open: boolean;
  onClose: () => void;
  market: string;
  item: string;
  value: number;
}

export const DetailsContainer = ({
  open,
  onClose,
  market,
  item,
  value,
}: DetailsContainerProps) => {
  const [selectedVipId, setSelectedVipId] = useState<string | null>(null);
  const [selectedPremiseType, setSelectedPremiseType] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");

  const handleRetailerClick = (
    vipId: string,
    premiseType: string,
    name: string
  ) => {
    setSelectedVipId(vipId);
    setSelectedPremiseType(premiseType);
    setSelectedName(name);
  };

  const handleBackToList = () => {
    setSelectedVipId(null);
    setSelectedPremiseType("");
    setSelectedName("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent>
        {selectedVipId ? (
          <PremiseDetails
            vipId={selectedVipId}
            premiseType={selectedPremiseType}
            name={selectedName}
            onBack={handleBackToList}
          />
        ) : (
          <DepletionDetails
            market={market}
            item={item}
            value={value}
            onRetailerClick={handleRetailerClick}
          />
        )}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
