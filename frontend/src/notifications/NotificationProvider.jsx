import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { emptyHistory, historyReducer, loadHistory, persistHistory } from "./history.mjs";

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

function initialize() {
  try { return loadHistory(window.localStorage); }
  catch { return { history: emptyHistory(), warning: "Notification history is unavailable. Messages are available for this session only." }; }
}

export default function NotificationProvider({ children }) {
  const [initial] = useState(initialize);
  const [history, dispatch] = useReducer(historyReducer, initial.history);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  // Persisted health is only a deduplication marker; verify before showing an active warning.
  const [collectionWarning, setCollectionWarning] = useState(null);
  const healthRevision = useRef(0);

  const addNotification = useCallback((entry) => dispatch({ type: "add", entry }), []);
  const reportWarning = useCallback((category, message) => addNotification({
    key: crypto.randomUUID(), category, severity: "warning", message, timestamp: new Date().toISOString(),
  }), [addNotification]);
  const reportHealth = useCallback((message) => {
    ++healthRevision.current;
    setCollectionWarning(message);
    dispatch({ type: "health", message, entry: {
      key: crypto.randomUUID(), category: "scheduler", severity: "warning", message,
      timestamp: new Date().toISOString(),
    } });
  }, []);
  const setOpen = useCallback((open) => dispatch({ type: "open", open }), []);

  useEffect(() => {
    try {
      const warning = persistHistory(window.localStorage, history);
      if (warning) setStorageWarning(warning);
    } catch { setStorageWarning("Notification history could not be saved. Messages are available for this session only."); }
  }, [history]);

  useEffect(() => {
    let active = true;
    let pending = false;
    async function check() {
      if (!active || pending || document.visibilityState === "hidden") return;
      pending = true;
      const revision = healthRevision.current;
      try {
        const result = await window.onionManager.getCollectionSettings();
        if (active && revision === healthRevision.current) reportHealth(result.error || result.healthWarning || null);
      } catch (failure) {
        if (active && revision === healthRevision.current) reportHealth(`Unable to check automatic collection: ${failure.message}`);
      } finally { pending = false; }
    }
    Promise.resolve().then(check);
    const interval = window.setInterval(check, 30000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [reportHealth]);

  return <NotificationContext.Provider value={{ entries: history.entries, open: history.open, setOpen,
    addNotification, reportWarning, reportHealth, collectionWarning, storageWarning }}>
    {children}
  </NotificationContext.Provider>;
}
