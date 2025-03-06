import { Box, Grid, Chip, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { Typography } from "@mui/material";

export const UserSettings = () => {
  const [markets] = useState(["New York", "New Jersey"]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              Name
            </Typography>
            <Typography>John Doe</Typography>
          </Box>
          <IconButton size="small">
            <EditIcon />
          </IconButton>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              Email
            </Typography>
            <Typography>John@wsgrant.com</Typography>
          </Box>
          <IconButton size="small">
            <EditIcon />
          </IconButton>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              Division
            </Typography>
            <Typography>Franchise / Independents</Typography>
          </Box>
          <IconButton size="small">
            <EditIcon />
          </IconButton>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              Markets
            </Typography>
            <Box sx={{ mt: 1 }}>
              {markets.map((market) => (
                <Chip
                  key={market}
                  label={market}
                  onDelete={() => {}}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Box>
          <IconButton size="small">
            <EditIcon />
          </IconButton>
        </Box>
      </Grid>
    </Grid>
  );
};
