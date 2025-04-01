import { useState, useEffect } from "react";
import { Dialog, DialogContent, IconButton, Box, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DepletionDetails } from "./depletionDetails";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";
import axios from "axios";

interface DetailsContainerProps {
  open: boolean;
  onClose: () => void;
  market: string;
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
  market,
  product,
  value,
  month,
  year,
  variant_size_pack_id,
  variant_size_pack_desc,
}: DetailsContainerProps) => {
  const [accountLevelSalesData, setAccountLevelSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchAccountLevelSales = async () => {
      const productToQuery = variant_size_pack_desc || product;
      if (!open || !market || !productToQuery) return;

      setIsLoading(true);
      setDataReady(false);
      setShowContent(false);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/volume/account-level-sales`,
          {
            params: {
              month,
              market,
              product: productToQuery,
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          }
        );

        if (isMounted) {
          setAccountLevelSalesData(response.data);
          setDataReady(true);
        }
      } catch (error: unknown) {
        if (axios.isCancel(error)) return;
        console.error("Error fetching account level sales:", error);
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
  }, [open, month, market, product, variant_size_pack_desc]);

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
              skipAnimation={accountLevelSalesData.length > 0}
            />
          </Box>
        ) : showContent ? (
          <>
            <DepletionDetails
              market={market}
              item={variant_size_pack_desc || product}
              value={value}
              month={Number(month)}
              year={year}
              variant_size_pack_id={variant_size_pack_id || product}
              variant_size_pack_desc={variant_size_pack_desc || product}
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
