import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

interface CommentDialogProps {
  open: boolean;
  onClose: () => void;
  commentary?: string;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({
  open,
  onClose,
  commentary,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Commentary</DialogTitle>
      <DialogContent>
        <Typography>{commentary || "No commentary available."}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
