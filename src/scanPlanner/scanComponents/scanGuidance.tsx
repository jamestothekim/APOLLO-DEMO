import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";

export interface GuidanceOption {
  key: string;
  label: string;
  sublabel?: string;
}

interface ScanGuidanceDialogProps {
  open: boolean;
  title?: string;
  availableOptions: GuidanceOption[];
  selectedKeys: string[];
  onApply: (keys: string[]) => void;
  onClose: () => void;
}

const ScanGuidanceDialog: React.FC<ScanGuidanceDialogProps> = ({
  open,
  title = "Customize Columns",
  availableOptions,
  selectedKeys,
  onApply,
  onClose,
}) => {
  const [selected, setSelected] = useState<string[]>(selectedKeys);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(selectedKeys);
      setFilterText("");
    }
  }, [open, selectedKeys]);

  const toggleSelect = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    if (selected.length === 0) return; // prevent hiding all columns
    onApply(selected);
    onClose();
  };

  const filteredOptions = availableOptions.filter((opt) =>
    opt.label.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          label="Filter columns"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <List dense sx={{ maxHeight: 300, overflowY: "auto" }}>
          {filteredOptions.map((opt) => {
            const isSel = selected.includes(opt.key);
            return (
              <ListItem key={opt.key} disablePadding>
                <ListItemText
                  primary={opt.label}
                  secondary={opt.sublabel || null}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                <ListItemSecondaryAction>
                  <Tooltip title={isSel ? "Remove from view" : "Add to view"}>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => toggleSelect(opt.key)}
                    >
                      {isSel ? (
                        <ViewColumnIcon fontSize="small" color="primary" />
                      ) : (
                        <ViewColumnOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={selected.length === 0}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScanGuidanceDialog;
