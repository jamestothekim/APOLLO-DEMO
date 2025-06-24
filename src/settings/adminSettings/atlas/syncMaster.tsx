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
  Tooltip,
} from "@mui/material";
import axios from "axios";
import { generateSampleFile } from "./syncMasterUtil/exportLogic";
import Alert from "@mui/material/Alert";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { DataFormat } from "./syncMasterComponents/dataFormat";
import { SFTPConfig } from "./syncMasterComponents/sftpConfig";
import {
  DataFrequency,
  FrequencyConfig,
} from "./syncMasterComponents/dataFrequency";

export interface syncMaster {
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
  onSave: (configs: Record<string, syncMaster>) => void;
}

// Utility to create default config per third-party system
const createDefaultConfig = (): syncMaster => ({
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
  const [configs, setConfigs] = useState<Record<string, syncMaster>>(() => {
    const initial: Record<string, syncMaster> = {};
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

  // load existing configs from backend when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchExistingConfigs = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/atlas/sync-configs`
        );
        const rows: any[] = res.data || [];
        setConfigs((prev) => {
          const updated = { ...prev };
          rows.forEach((row) => {
            const def = createDefaultConfig();
            const freq =
              row.frequency && Object.keys(row.frequency).length
                ? row.frequency
                : undefined;
            const merged: syncMaster = {
              ...def,
              ...(row.data_format || {}),
              frequency: freq,
            } as syncMaster;
            if (row.credentials) {
              if (row.credentials.sftp) merged.sftp = row.credentials.sftp;
              if (row.credentials.api) merged.api = row.credentials.api;
            }
            if (row.connection_method)
              merged.connectionMethod = row.connection_method;
            updated[row.system_key] = merged;
          });
          return updated;
        });
      } catch (err) {
        console.error("Error fetching existing sync configs", err);
      }
    };
    fetchExistingConfigs();
  }, [open]);

  // Convenience helpers to evaluate completion status
  const isFormattingComplete = (cfg: syncMaster) =>
    cfg.selectedFields.length > 0;
  const isSFTPComplete = (cfg: syncMaster) => {
    if (cfg.connectionMethod === "outbound_sftp") {
      return !!cfg.sftp.host && !!cfg.sftp.username && !!cfg.sftp.password;
    }
    if (cfg.connectionMethod === "inbound_sftp") {
      const hasPk =
        typeof cfg.sftp.publicKey === "string" &&
        cfg.sftp.publicKey.trim().length > 0;
      return !!cfg.sftp.host && !!cfg.sftp.username && hasPk;
    }
    return true;
  };
  const isFrequencySet = (cfg: syncMaster) =>
    !!cfg.frequency && Object.keys(cfg.frequency as any).length > 0;
  const isPrimaryKeySet = (cfg: syncMaster) => cfg.primaryKey.length > 0;

  const getStatus = (cfg: syncMaster) => {
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
      // Save all configs to backend
      await axios.post(`${import.meta.env.VITE_API_URL}/atlas/sync-configs`, {
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
      <DialogTitle>ATLAS Sync Master</DialogTitle>
      <DialogContent dividers>
        {view === "main" && (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Configure the file format and SFTP credentials for each system.
              Fields selected will be exported in the order specified. Header
              names are optional; leave blank to use the field name. Example
              extracts can be downloaded for validation.
            </Typography>

            <Alert
              severity={overallReady ? "success" : "warning"}
              sx={{ mb: 2 }}
            >
              {overallReady
                ? "All systems ready for sync."
                : "Some systems are missing configuration. Please complete before syncing."}
            </Alert>
          </>
        )}

        {view === "main" ? (
          <>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>System</TableCell>
                    <TableCell>Connection Method</TableCell>
                    <TableCell align="center">Format</TableCell>
                    <TableCell align="center">Credentials</TableCell>
                    <TableCell align="center">Frequency</TableCell>
                    <TableCell align="center">Actions</TableCell>
                    <TableCell align="center">Status</TableCell>
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
                          </Select>
                        </TableCell>
                        {/* Format column */}
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isFormattingComplete(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="secondary" fontSize="small" />
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
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isSFTPComplete(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="secondary" fontSize="small" />
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
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isFrequencySet(cfg) ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="secondary" fontSize="small" />
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
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                            alignItems="center"
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<FileDownloadIcon fontSize="small" />}
                              onClick={() => handleExportExample(system)}
                              disabled={!isFormattingComplete(cfg)}
                              sx={{ minWidth: 90 }}
                            >
                              Export
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<SyncIcon fontSize="small" />}
                              onClick={() => handleSyncSystem(system)}
                              disabled={!ready}
                              sx={{ minWidth: 90 }}
                            >
                              Sync
                            </Button>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip
                            title={ready ? "Ready for Sync" : statusText}
                            arrow
                          >
                            {ready ? (
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            ) : (
                              <CancelIcon color="secondary" fontSize="small" />
                            )}
                          </Tooltip>
                        </TableCell>
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
