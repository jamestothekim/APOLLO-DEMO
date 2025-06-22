import { Stack, Button, Typography, TextField } from "@mui/material";
import { StagingConfig } from "./stagingDialog";

interface SFTPConfigProps {
  system: string;
  config: StagingConfig;
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
      <Typography variant="h6">SFTP Credentials – {system}</Typography>
      <TextField
        label="Host"
        value={config.sftp.host}
        onChange={(e) => onFieldChange(["sftp", "host"], e.target.value)}
      />
      <TextField
        label="Username"
        value={config.sftp.username}
        onChange={(e) => onFieldChange(["sftp", "username"], e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        value={config.sftp.password}
        onChange={(e) => onFieldChange(["sftp", "password"], e.target.value)}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onBack}>
          Save
        </Button>
      </Stack>
    </Stack>
  );
};
