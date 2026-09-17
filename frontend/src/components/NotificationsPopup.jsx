import React from "react";
import { Alert, Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  List, ListItem, ListItemIcon, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckIcon from "@mui/icons-material/Check";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useNotifications } from "../notifications/NotificationProvider";
import { formatTimestamp } from "../notifications/history.mjs";

export default function NotificationsPopup() {
  const { entries, open, setOpen, storageWarning } = useNotifications();
  const unread = entries.filter((entry) => !entry.read).length;
  return <>
    <IconButton className="notifications-toggle" onClick={() => setOpen(true)} title="Notifications"
      aria-label={`Open notifications${unread ? `, ${unread} unread` : ""}`} aria-haspopup="dialog">
      <Badge badgeContent={unread} color="primary" max={99}>
        <NotificationsNoneIcon />
      </Badge>
    </IconButton>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="notifications-title"
      slotProps={{ paper: { sx: { borderRadius: "6px", backgroundImage: "none" } } }}>
      <DialogTitle id="notifications-title">Notifications</DialogTitle>
      <DialogContent dividers sx={{ p: 0, maxHeight: "60vh" }}>
        {storageWarning && <Alert severity="warning" sx={{ m: 2 }}>{storageWarning}</Alert>}
        {entries.length === 0 ? <Typography color="text.secondary" sx={{ px: 3, py: 4 }}>
          No notifications yet
        </Typography> : <List disablePadding aria-label="App notification history">
          {entries.map((entry, index) => <ListItem key={entry.key} divider={index < entries.length - 1}
            sx={{ px: 3, py: 2, alignItems: "flex-start" }}>
            <ListItemIcon sx={{ minWidth: 34, mt: "2px", color: entry.severity === "warning" ? "warning.main" : "text.secondary" }}>
              {entry.severity === "warning" ? <WarningAmberIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere", lineHeight: 1.6 }}>
              {entry.severity === "warning" && <span className="visually-hidden">Warning: </span>}
              {entry.message}{entry.severity === "general" ? " at " : " · "}<Typography component="time" variant="inherit" color="text.secondary" dateTime={entry.timestamp}>
                {formatTimestamp(entry.timestamp)}
              </Typography>
            </Typography>
          </ListItem>)}
        </List>}
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
  </>;
}
