import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import axios from "axios";

export interface StagingConfig {
  delimiter: string;
  selectedFields: string[];
  headerMap: Record<string, string>; // field -> header name
  sftp: {
    host: string;
    username: string;
    password: string;
    port?: string;
    path?: string;
  };
}

export interface StagingDialogProps {
  open: boolean;
  onClose: () => void;
  thirdPartyKeys: string[]; // ["jenda", "nielsen", ...]
  onSave: (configs: Record<string, StagingConfig>) => void;
}

// A minimal list of fields available to map – should be replaced with dynamic data in future
const AVAILABLE_FIELDS: string[] = [
  "sku_id",
  "sku_description",
  "brand",
  "variant",
  "size_pack_desc",
  "activation_date",
];

// Utility to create default config per third-party system
const createDefaultConfig = (): StagingConfig => ({
  delimiter: "|",
  selectedFields: [],
  headerMap: {},
  sftp: {
    host: "",
    username: "",
    password: "",
    port: "22",
    path: "/",
  },
});

export const StagingDialog = ({
  open,
  onClose,
  thirdPartyKeys,
  onSave,
}: StagingDialogProps) => {
  // Local state holding configs per system key
  const [configs, setConfigs] = useState<Record<string, StagingConfig>>(() => {
    const initial: Record<string, StagingConfig> = {};
    thirdPartyKeys.forEach((key) => {
      initial[key] = createDefaultConfig();
    });
    return initial;
  });

  // --- Handlers ---
  const handleConfigFieldChange = (
    system: string,
    fieldPath: string[],
    value: any
  ) => {
    setConfigs((prev) => {
      const updated = { ...prev };
      let target: any = updated[system];
      for (let i = 0; i < fieldPath.length - 1; i++) {
        const path = fieldPath[i];
        if (!target[path]) target[path] = {};
        target = target[path];
      }
      target[fieldPath[fieldPath.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      // TODO: credentials should be encrypted on backend
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/staging-config`, {
        configs,
      });
      onSave(configs);
    } catch (err) {
      console.error("Error saving staging configuration", err);
    }
  };

  const handleExportExample = async (system: string) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/staging-config/export-example`,
        { system, config: configs[system] },
        { responseType: "blob" }
      );
      // Create blob url to download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${system}_example.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Error exporting example", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Third-Party Staging Configuration</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Configure the file format and SFTP credentials for each system. Fields
          selected will be exported in the order specified. Header names are
          optional; leave blank to use the field name. Example extracts can be
          downloaded for validation.
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>System</TableCell>
                <TableCell>Delimiter</TableCell>
                <TableCell>Fields (comma-separated)</TableCell>
                <TableCell>Headers (comma-separated)</TableCell>
                <TableCell>SFTP Host</TableCell>
                <TableCell>SFTP User</TableCell>
                <TableCell>SFTP Password</TableCell>
                <TableCell>Export</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {thirdPartyKeys.map((system) => {
                const cfg = configs[system];
                return (
                  <TableRow key={system} hover>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {system}
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={cfg.delimiter}
                        onChange={(e) =>
                          handleConfigFieldChange(
                            system,
                            ["delimiter"],
                            e.target.value
                          )
                        }
                        size="small"
                        inputProps={{ maxLength: 2, style: { width: 40 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        placeholder="field1,field2"
                        value={cfg.selectedFields.join(",")}
                        onChange={(e) =>
                          handleConfigFieldChange(
                            system,
                            ["selectedFields"],
                            e.target.value.split(",").map((s) => s.trim())
                          )
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        placeholder="header1,header2"
                        value={cfg.selectedFields
                          .map((f) => cfg.headerMap[f] || "")
                          .join(",")}
                        onChange={(e) => {
                          const headers = e.target.value
                            .split(",")
                            .map((h) => h.trim());
                          setConfigs((prev) => {
                            const updated = { ...prev };
                            const hMap: Record<string, string> = {};
                            headers.forEach((h, idx) => {
                              const field = cfg.selectedFields[idx];
                              if (field) hMap[field] = h;
                            });
                            updated[system] = { ...cfg, headerMap: hMap };
                            return updated;
                          });
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={cfg.sftp.host}
                        onChange={(e) =>
                          handleConfigFieldChange(
                            system,
                            ["sftp", "host"],
                            e.target.value
                          )
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={cfg.sftp.username}
                        onChange={(e) =>
                          handleConfigFieldChange(
                            system,
                            ["sftp", "username"],
                            e.target.value
                          )
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="password"
                        value={cfg.sftp.password}
                        onChange={(e) =>
                          handleConfigFieldChange(
                            system,
                            ["sftp", "password"],
                            e.target.value
                          )
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleExportExample(system)}
                      >
                        Example
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Field reference list */}
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          {AVAILABLE_FIELDS.map((f) => (
            <Typography key={f} variant="caption" sx={{ mr: 1 }}>
              {f}
            </Typography>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
