import { Stack, Button, Typography, TextField, Box } from "@mui/material";
import { syncMaster } from "../syncMaster";

interface SFTPConfigProps {
  system: string;
  config: syncMaster;
  onBack: () => void;
  onFieldChange: (fieldPath: string[], value: any) => void;
}

export const SFTPConfig = ({
  system,
  config,
  onBack,
  onFieldChange,
}: SFTPConfigProps) => {
  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="h6">Connection Details – {system}</Typography>

      {config.connectionMethod === "outbound_sftp" ? (
        <>
          <TextField
            label="Host"
            value={config.sftp.host}
            onChange={(e) => onFieldChange(["sftp", "host"], e.target.value)}
          />
          <TextField
            label="Username"
            value={config.sftp.username}
            onChange={(e) =>
              onFieldChange(["sftp", "username"], e.target.value)
            }
          />
          <TextField
            label="Password"
            type="password"
            value={config.sftp.password}
            onChange={(e) =>
              onFieldChange(["sftp", "password"], e.target.value)
            }
          />
          <TextField
            label="Port"
            value={config.sftp.port}
            onChange={(e) => onFieldChange(["sftp", "port"], e.target.value)}
          />
          <TextField
            label="Path"
            value={config.sftp.path}
            onChange={(e) => onFieldChange(["sftp", "path"], e.target.value)}
          />
        </>
      ) : config.connectionMethod === "inbound_sftp" ? (
        <>
          <TextField
            label="Host"
            value={config.sftp.host}
            onChange={(e) => onFieldChange(["sftp", "host"], e.target.value)}
          />
          <TextField
            label="Username"
            value={config.sftp.username}
            onChange={(e) =>
              onFieldChange(["sftp", "username"], e.target.value)
            }
          />
          <TextField
            label="Port"
            value={config.sftp.port}
            onChange={(e) => onFieldChange(["sftp", "port"], e.target.value)}
          />
          <TextField
            label="Path"
            value={config.sftp.path}
            onChange={(e) => onFieldChange(["sftp", "path"], e.target.value)}
          />
          <TextField
            label="SSH Public Key"
            multiline
            minRows={3}
            value={config.sftp.publicKey || ""}
            onChange={(e) =>
              onFieldChange(["sftp", "publicKey"], e.target.value)
            }
            helperText="Provide the partner's SSH RSA public key to allow access"
          />
          <TextField
            label="Allowed IP / CIDR"
            value={config.sftp.allowedIp || ""}
            onChange={(e) =>
              onFieldChange(["sftp", "allowedIp"], e.target.value)
            }
            helperText="Optional: limit access to a specific IP or CIDR block"
          />
        </>
      ) : (
        <>
          <Typography variant="body2">
            API connections will be configured later. Collect any preliminary
            information if available.
          </Typography>
          <TextField
            label="Base URL"
            value={config.api?.baseUrl || ""}
            onChange={(e) => onFieldChange(["api", "baseUrl"], e.target.value)}
          />
          <TextField
            label="Auth Token / Key"
            value={config.api?.token || ""}
            onChange={(e) => onFieldChange(["api", "token"], e.target.value)}
          />
        </>
      )}

      {/* Sticky footer */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          mb: 0,
        }}
      >
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onBack}>
          Save
        </Button>
      </Box>
    </Stack>
  );
};
