import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface CommentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (comment: string) => void;
  initialComment?: string;
}

export const CommentDialog = ({
  open,
  onClose,
  onSave,
  initialComment = "",
}: CommentDialogProps) => {
  const [comment, setComment] = useState(initialComment);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Comment</DialogTitle>
      <DialogContent>
        <TextField
          multiline
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(comment)} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
