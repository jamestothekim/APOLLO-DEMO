import { useState, useEffect } from "react";
import { Dialog, DialogContent, IconButton, Box, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DepletionDetails } from "./depletionDetails";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";

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
  const [accountLevelSalesData, setAccountLevelSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let controller = new AbortController();

    const fetchAccountLevelSales = async () => {
      if (!open || !market || !product) return;

      setIsLoading(true);
      setDataReady(false);
      setShowContent(false);
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

        if (isMounted) {
          setAccountLevelSalesData(data);
          setDataReady(true);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === "AbortError") return;
          console.error("Error fetching account level sales:", error);
        }
        if (isMounted) {
          setShowContent(true); // Show error state
          setIsLoading(false);
        }
      }
    };

    fetchAccountLevelSales();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [open, month, market, product]);

  const handleLoadingComplete = () => {
    if (dataReady) {
      setShowContent(true);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
            }}
          >
            <LoadingProgress
              onComplete={handleLoadingComplete}
              dataReady={dataReady}
            />
          </Box>
        ) : showContent ? (
          <>
            <DepletionDetails
              market={market}
              item={product}
              value={value}
              month={Number(month)}
              year={year}
              variant_size_pack={product}
              onRetailerClick={() => {}}
              accountLevelSalesData={accountLevelSalesData}
              isLoading={isLoading}
            />
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={onClose} variant="contained">
                Close
              </Button>
            </Box>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
