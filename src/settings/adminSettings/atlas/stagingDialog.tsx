import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import axios from "axios";
import { generateSampleFile } from "./exportLogic";
import Alert from "@mui/material/Alert";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { DataFormat } from "./dataFormat";
import { SFTPConfig } from "./sftpConfig";
import { DataFrequency, FrequencyConfig } from "./dataFrequency";

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
    publicKey?: string;
    allowedIp?: string;
  };
  api?: {
    baseUrl: string;
    token: string;
  };
  frequency?: FrequencyConfig;
  primaryKey: string[];
  connectionMethod: string;
}

export interface StagingDialogProps {
  open: boolean;
  onClose: () => void;
  thirdPartyKeys: string[]; // ["jenda", "nielsen", ...]
  onSave: (configs: Record<string, StagingConfig>) => void;
}

// Utility to create default config per third-party system
const createDefaultConfig = (): StagingConfig => ({
  delimiter: ",",
  selectedFields: [],
  headerMap: {},
  sftp: {
    host: "",
    username: "",
    password: "",
    port: "22",
    path: "/",
    publicKey: "",
    allowedIp: "",
  },
  api: { baseUrl: "", token: "" },
  connectionMethod: "outbound_sftp",
  frequency: undefined,
  primaryKey: [],
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

  // View state for navigating between list and detail editors
  const [view, setView] = useState<"main" | "format" | "sftp" | "freq">("main");
  const [activeSystem, setActiveSystem] = useState<string | null>(null);

  // master data cache
  const [marketRows, setMarketRows] = useState<any[]>([]);
  const [skuRows, setSkuRows] = useState<any[]>([]);

  // load master data once
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [marketsRes, skusRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/admin/get-states`),
          axios.get(`${import.meta.env.VITE_API_URL}/atlas/sku-master`),
        ]);
        setMarketRows(marketsRes.data || []);
        setSkuRows(skusRes.data || []);
      } catch (err) {
        console.error("Error fetching master data", err);
      }
    };
    fetchMasterData();
  }, []);

  // Convenience helpers to evaluate completion status
  const isFormattingComplete = (cfg: StagingConfig) =>
    cfg.selectedFields.length > 0;
  const isSFTPComplete = (cfg: StagingConfig) =>
    cfg.connectionMethod === "outbound_sftp"
      ? !!cfg.sftp.host && !!cfg.sftp.username && !!cfg.sftp.password
      : true;
  const isFrequencySet = (cfg: StagingConfig) => !!cfg.frequency;
  const isPrimaryKeySet = (cfg: StagingConfig) => cfg.primaryKey.length > 0;

  const getStatus = (cfg: StagingConfig) => {
    if (
      isFormattingComplete(cfg) &&
      isSFTPComplete(cfg) &&
      isPrimaryKeySet(cfg)
    )
      return "Ready";
    if (!isFormattingComplete(cfg) && !isSFTPComplete(cfg))
      return "Missing Format & Credentials";
    if (!isFormattingComplete(cfg)) return "Missing Format";
    return "Missing Credentials";
  };

  const overallReady = thirdPartyKeys.every((k) => {
    const cfg = configs[k];
    return isFormattingComplete(cfg) && isSFTPComplete(cfg);
  });

  const handleSyncSystem = (system: string) => {
    if (getStatus(configs[system]) !== "Ready") return;
    console.log(`Initiate sync for ${system}`);
    // TODO integrate with backend
  };

  const handleSyncAll = () => {
    thirdPartyKeys.forEach((system) => handleSyncSystem(system));
  };

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

  const handleExportExample = (system: string) => {
    try {
      const sample = generateSampleFile(configs[system], marketRows, skuRows);
      const blob = new Blob([sample], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${system}_example.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Error generating sample export", err);
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

        <Alert severity={overallReady ? "success" : "warning"} sx={{ mb: 2 }}>
          {overallReady
            ? "All systems ready for sync."
            : "Some systems are missing configuration. Please complete before syncing."}
        </Alert>

        {view === "main" ? (
          <>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>System</TableCell>
                    <TableCell>Connection Method</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Credentials</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Actions</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {thirdPartyKeys.map((system) => {
                    const cfg = configs[system];
                    const statusText = getStatus(cfg);
                    const ready = statusText === "Ready";
                    return (
                      <TableRow key={system} hover>
                        <TableCell sx={{ textTransform: "capitalize" }}>
                          {system}
                        </TableCell>
                        {/* Connection Method column */}
                        <TableCell>
                          <Select
                            size="small"
                            value={cfg.connectionMethod}
                            onChange={(e) =>
                              handleConfigFieldChange(
                                system,
                                ["connectionMethod"],
                                e.target.value
                              )
                            }
                            sx={{ width: 160 }}
                          >
                            <MenuItem value="outbound_sftp">
                              Outbound SFTP
                            </MenuItem>
                            <MenuItem value="inbound_sftp">
                              Inbound SFTP
                            </MenuItem>
                            <MenuItem value="api">API</MenuItem>
                          </Select>
                        </TableCell>
                        {/* Format column */}
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {isFormattingComplete(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="error" fontSize="small" />
                            )}
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => {
                                setActiveSystem(system);
                                setView("format");
                              }}
                            >
                              Configure
                            </Button>
                          </Stack>
                        </TableCell>
                        {/* Credentials column */}
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {isSFTPComplete(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="error" fontSize="small" />
                            )}
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => {
                                setActiveSystem(system);
                                setView("sftp");
                              }}
                            >
                              Configure
                            </Button>
                          </Stack>
                        </TableCell>
                        {/* Frequency column */}
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {isFrequencySet(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="error" fontSize="small" />
                            )}
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => {
                                setActiveSystem(system);
                                setView("freq");
                              }}
                            >
                              Configure
                            </Button>
                          </Stack>
                        </TableCell>
                        {/* Actions column */}
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleExportExample(system)}
                              disabled={!isFormattingComplete(cfg)}
                            >
                              Export Sample
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<SyncIcon fontSize="small" />}
                              onClick={() => handleSyncSystem(system)}
                              disabled={!ready}
                            >
                              Sync
                            </Button>
                          </Stack>
                        </TableCell>
                        <TableCell>{statusText}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : view === "format" && activeSystem ? (
          <DataFormat
            system={activeSystem}
            config={configs[activeSystem]}
            onBack={() => setView("main")}
            onSave={() => setView("main")}
            onFieldChange={(fieldPath, value) =>
              handleConfigFieldChange(activeSystem!, fieldPath, value)
            }
          />
        ) : view === "sftp" && activeSystem ? (
          <SFTPConfig
            system={activeSystem}
            config={configs[activeSystem]}
            onBack={() => setView("main")}
            onFieldChange={(fieldPath, value) =>
              handleConfigFieldChange(activeSystem!, fieldPath, value)
            }
          />
        ) : view === "freq" && activeSystem ? (
          <DataFrequency
            system={activeSystem}
            config={configs[activeSystem]}
            onBack={() => setView("main")}
            onSave={() => setView("main")}
            onFieldChange={(fieldPath, value) =>
              handleConfigFieldChange(activeSystem!, fieldPath, value)
            }
          />
        ) : null}
      </DialogContent>
      {view === "main" && (
        <DialogActions sx={{ justifyContent: "space-between" }}>
          {/* Left corner */}
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSyncAll}
            disabled={!overallReady}
          >
            Sync All
          </Button>

          {/* Right side actions */}
          <Box>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} sx={{ ml: 1 }}>
              Save
            </Button>
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
};
