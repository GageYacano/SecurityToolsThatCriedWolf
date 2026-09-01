import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

export default function SettingsPopup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton
        className="settings-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
        title="Open settings"
      >
        <SettingsOutlinedIcon />
      </IconButton>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        aria-labelledby="settings-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Current application settings
          </Typography>
          <TextField
            label="Update Interval"
            value="hh:mm:ss"
            fullWidth
            size="small"
            margin="dense"
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="User ID"
            value="<user hash id>"
            fullWidth
            size="small"
            margin="dense"
            slotProps={{ input: { readOnly: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
