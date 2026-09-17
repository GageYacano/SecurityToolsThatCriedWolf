import React, { useRef, useState } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Switch, TextField, Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import { useNotifications } from "../notifications/NotificationProvider";

const INTERVALS = [[1, "1 minute"], [15, "15 minutes"], [30, "30 minutes"], [60, "1 hour"], [360, "6 hours"], [1440, "24 hours"]];
const DEFAULTS = { automaticCollection: false, collectionIntervalMinutes: 60 };

export default function SettingsPopup() {
  const { reportHealth, reportWarning } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  async function open() {
    setIsOpen(true);
    setBusy(true);
    setState(null);
    setError(null);
    const request = ++requestRef.current;
    try {
      const result = await window.onionManager.getCollectionSettings();
      if (request !== requestRef.current) return;
      setSettings(result.settings);
      setState(result);
      setError(result.error);
      reportHealth(result.error || result.healthWarning || null);
    } catch (failure) {
      if (request === requestRef.current) {
        setError(failure.message);
        reportWarning("settings", `Unable to load collection settings: ${failure.message}`);
      }
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    ++requestRef.current;
    setIsOpen(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const result = await window.onionManager.saveCollectionSettings(settings);
      setState(result);
      setSettings(result.settings);
      setError(result.error);
      reportHealth(result.error || result.healthWarning || null);
    } catch (failure) {
      setError(failure.message);
      reportWarning("settings", `Unable to save collection settings: ${failure.message}`);
    } finally { setBusy(false); }
  }

  const statusText = {
    active: "Schedule registered.",
    inactive: "No automatic collection job is registered.",
    blocked: "macOS has disabled this background job. Check Login Items & Extensions in System Settings.",
    unknown: "The schedule's current state could not be determined.",
    unsupported: "Automatic collection is currently available only on macOS.",
  };

  return (
    <>
      <IconButton className="settings-toggle" onClick={open} aria-label="Open settings" title="Open settings">
        <SettingsOutlinedIcon />
      </IconButton>
      <Dialog open={isOpen} onClose={close} aria-labelledby="settings-dialog-title" fullWidth maxWidth="sm">
        <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Automatic collection continues after quitting OnionManager while you are logged in.
            Enabling it collects immediately. Missed collections during sleep are not replayed.
          </Typography>
          {state?.development && <Alert severity="info" sx={{ mb: 2 }}>
            This development schedule is separate from the installed app and continues after development exits. Disable it here when finished testing.
          </Alert>}
          <FormControlLabel label="Automatic collection" control={
            <Switch checked={settings.automaticCollection} disabled={busy || !state?.supported}
              onChange={(_event, checked) => setSettings((current) => ({ ...current, automaticCollection: checked }))} />
          } />
          <TextField select label="Collection interval" fullWidth margin="normal" size="small"
            value={settings.collectionIntervalMinutes} disabled={busy || !state?.supported || !settings.automaticCollection}
            onChange={(event) => setSettings((current) => ({ ...current, collectionIntervalMinutes: Number(event.target.value) }))}>
            {INTERVALS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <Typography role="status" color="text.secondary" sx={{ mt: 2 }}>
            {busy ? "Applying or loading settings..." : statusText[state?.status]}
          </Typography>
          {state?.healthWarning && <Alert severity="warning" sx={{ mt: 2 }}>{state.healthWarning}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !state?.supported}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
