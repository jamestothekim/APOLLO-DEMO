import {
  DialogTitle,
  Box,
  Typography,
  Paper,
  IconButton,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface PremiseDetailsProps {
  onBack: () => void;
  vipId: string;
  premiseType: string;
  name: string;
}

const getRandomNumber = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const subclassMap = {
  "On Premise": [
    "Casual Restaurant",
    "Bar/Tavern",
    "Fine Dining",
    "Hotel/Motel",
    "Sports Bar",
  ],
  "Off Premise": [
    "Liquor Store",
    "Grocery Store",
    "Convenience Store",
    "Wine Shop",
    "Warehouse Club",
  ],
};

export const PremiseDetails = ({
  onBack,
  vipId,
  premiseType,
  name,
}: PremiseDetailsProps) => {
  const subclass =
    subclassMap[premiseType as keyof typeof subclassMap]?.[
      Math.floor(Math.random() * 5)
    ];

  const portfolioSales = {
    "The Balvenie": getRandomNumber(100, 1000),
    "Hendricks Gin": getRandomNumber(200, 800),
    Milagros: getRandomNumber(300, 900),
  };

  const spectraDemandIndex = getRandomNumber(50, 150);

  return (
    <>
      <DialogTitle>
        <IconButton onClick={onBack} edge="start" sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        Account Details
      </DialogTitle>

      <Grid container spacing={3} sx={{ p: 2 }}>
        {/* Left side - Basic Information */}
        <Grid item xs={4}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body1">
              <strong>Name:</strong> {name}
            </Typography>
            <Typography variant="body1">
              <strong>Full Address:</strong>{" "}
              {`${Math.floor(
                Math.random() * 9999
              )} Main Street, Suite ${Math.floor(Math.random() * 999)}`}
            </Typography>
            <Typography variant="body1">
              <strong>Premise Type:</strong> {premiseType}
            </Typography>
            <Typography variant="body1">
              <strong>Subclass:</strong> {subclass}
            </Typography>
            <Typography variant="body1">
              <strong>VIP ID:</strong> {vipId}
            </Typography>
          </Box>
        </Grid>

        {/* Right side - Portfolio Sales and Spectra Demand Index */}
        <Grid item xs={8}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                YTDPortfolio Sales
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(portfolioSales).map(([product, sales]) => (
                  <Typography key={product} variant="body1">
                    <strong>{product}:</strong> {sales} 9L Cases
                  </Typography>
                ))}
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Spectra Demand Index
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  textAlign: "center",
                  color: "primary.main",
                  fontWeight: "bold",
                }}
              >
                {spectraDemandIndex}
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};
