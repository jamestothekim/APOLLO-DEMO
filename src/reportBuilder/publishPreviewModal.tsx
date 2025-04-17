import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  TextField,
  Chip,
  Stack,
} from "@mui/material";
import { PublishedItem, ReportConfig } from "../redux/dashboardSlice";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

interface PublishPreviewModalProps {
  open: boolean;
  onClose: () => void;
  itemToPublish: {
    requiredWidth: 6 | 12;
    config: ReportConfig;
    type: PublishedItem["type"];
  };
  onConfirmPlacement: (index: number, name: string) => void;
  existingItems: PublishedItem[];
}

interface DraggableListItem {
  id: string;
  name: string;
  isNew: boolean;
}

const reorder = (
  list: DraggableListItem[],
  startIndex: number,
  endIndex: number
): DraggableListItem[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export const PublishPreviewModal: React.FC<PublishPreviewModalProps> = ({
  open,
  onClose,
  itemToPublish,
  onConfirmPlacement,
  existingItems,
}) => {
  const [reportName, setReportName] = useState<string>("");
  const [orderedItems, setOrderedItems] = useState<DraggableListItem[]>([]);

  const newItemId = "new-item-placeholder";

  useEffect(() => {
    if (open) {
      const currentName = `My ${itemToPublish.type} Report`;
      setReportName(currentName);

      const initialList: DraggableListItem[] = [
        ...existingItems.map((item) => ({
          id: item.id,
          name: item.name || item.type,
          isNew: false,
        })),
        { id: newItemId, name: currentName || "(New Report)", isNew: true },
      ];
      setOrderedItems(initialList);
    }
  }, [open, itemToPublish, existingItems]);

  useEffect(() => {
    setOrderedItems((prev) =>
      prev.map((item) =>
        item.id === newItemId
          ? { ...item, name: reportName || "(New Report)" }
          : item
      )
    );
  }, [reportName]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = reorder(
      orderedItems,
      result.source.index,
      result.destination.index
    );

    setOrderedItems(items);
  };

  const handleConfirm = () => {
    if (reportName.trim()) {
      const finalIndex = orderedItems.findIndex(
        (item) => item.id === newItemId
      );
      onConfirmPlacement(
        finalIndex >= 0 ? finalIndex : orderedItems.length - 1,
        reportName.trim()
      );
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Publish Report to Dashboard</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          id="report-name"
          label="Report Name"
          type="text"
          fullWidth
          variant="outlined"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
          Set Report Order
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag the <strong>{reportName || "(New Report)"}</strong> chip to set
          its position in the sequence.
        </Typography>

        <Paper
          variant="outlined"
          sx={{ p: 2 /*, overflowX: 'auto' // Temporarily remove */ }}
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="reportOrder" direction="horizontal">
              {(provided) => (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {orderedItems.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(providedDraggable) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          style={{
                            ...providedDraggable.draggableProps.style,
                            display: "inline-block",
                          }}
                        >
                          <Chip
                            label={`${index + 1}. ${item.name}`}
                            color={item.isNew ? "primary" : "default"}
                            variant={item.isNew ? "filled" : "outlined"}
                            sx={{
                              whiteSpace: "nowrap",
                              fontStyle:
                                item.isNew && !reportName ? "italic" : "normal",
                              cursor: "grab",
                              opacity: 1,
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!reportName.trim()}
        >
          Publish
        </Button>
      </DialogActions>
    </Dialog>
  );
};
