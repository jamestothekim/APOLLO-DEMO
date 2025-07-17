import { useState, useEffect } from "react";
import { Dialog, DialogContent, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DepletionDetails } from "./depletionDetails";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";

interface DetailsContainerProps {
  open: boolean;
  onClose: () => void;
  market_id: string;
  product: string;
  value: number;
  month: any;
  year: number;
  variant_size_pack_id?: string;
  variant_size_pack_desc?: string;
}

export const DetailsContainer = ({
  open,
  onClose,
  market_id,
  product,
  value,
  month,
  year,
  variant_size_pack_id,
  variant_size_pack_desc,
}: DetailsContainerProps) => {
  const [accountLevelSalesData, setAccountLevelSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchAccountLevelSales = async () => {
      const productToQuery = variant_size_pack_desc || product;
      if (!open || !market_id || !productToQuery) return;

      setIsLoading(true);
      setDataReady(false);
      setShowContent(false);
      try {
        // Demo mode - generate account level sales data
        const { generateAccountLevelSalesData } = await import(
          "../../../playData/dataGenerators"
        );
        const { simulateApiDelay } = await import(
          "../../../playData/demoConfig"
        );

        await simulateApiDelay(); // Simulate API delay

        const accountLevelData = generateAccountLevelSalesData(
          market_id,
          productToQuery,
          month || new Date().getMonth() + 1,
          year || new Date().getFullYear()
        );

        if (isMounted) {
          setAccountLevelSalesData(accountLevelData);
          setDataReady(true);
        }
      } catch (error: unknown) {
        console.error("Error generating account level sales data:", error);
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
  }, [open, month, market_id, product, variant_size_pack_desc]);

  useEffect(() => {
    if (dataReady && accountLevelSalesData.length > 0) {
      handleLoadingComplete();
    }
  }, [dataReady, accountLevelSalesData.length]);

  const handleLoadingComplete = () => {
    setShowContent(true);
    setIsLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "1152px", // Standard md width (960px) + 20%
          maxWidth: "90vw",
        },
      }}
      fullWidth
    >
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
              skipAnimation={accountLevelSalesData.length > 0}
            />
          </Box>
        ) : showContent ? (
          <>
            <DepletionDetails
              market={market_id}
              value={value}
              month={Number(month)}
              year={year}
              variant_size_pack_id={variant_size_pack_id || product}
              variant_size_pack_desc={variant_size_pack_desc || product}
              onRetailerClick={() => {}}
              accountLevelSalesData={accountLevelSalesData}
              isLoading={isLoading}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
