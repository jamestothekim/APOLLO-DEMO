import { useState, useEffect } from "react";
import { Dialog, DialogContent, IconButton, Box, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DepletionDetails } from "./depletionDetails";
import { PremiseDetails } from "./premiseDetails";

interface DetailsContainerProps {
  open: boolean;
  onClose: () => void;
  market: string;
  product: string;
  value: number;
  month: any;
  year: number;
}

export const DetailsContainer = ({
  open,
  onClose,
  market,
  product,
  value,
  month,
  year,
}: DetailsContainerProps) => {
  const [selectedVipId, setSelectedVipId] = useState<string | null>(null);
  const [selectedPremiseType, setSelectedPremiseType] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [accountLevelSalesData, setAccountLevelSalesData] = useState([]);

  useEffect(() => {
    let isMounted = true;
    let controller = new AbortController();

    const fetchAccountLevelSales = async () => {
      if (!open || !market || !product) return;

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/volume/account-level-sales?month=${month}&market=${market}&product=${product}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch account level sales");
        }

        const data = await response.json();
        console.log(data);

        if (isMounted) {
          setAccountLevelSalesData(data);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === "AbortError") return;
          console.error("Error fetching account level sales:", error);
        }
      }
    };

    fetchAccountLevelSales();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [open, month, market, product]);

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
            item={product}
            value={value}
            month={Number(month)}
            year={year}
            variant_size_pack={product}
            onRetailerClick={handleRetailerClick}
            accountLevelSalesData={accountLevelSalesData}
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
