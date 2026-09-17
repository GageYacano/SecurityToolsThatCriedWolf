import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Alert, Box, IconButton, ThemeProvider, Typography, createTheme } from "@mui/material";
import OnionS from "./components/OnionS";
import SettingsPopup from "./components/SettingsPopup";
import Vulnerabilities from "./components/Vulnerabilities";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import NotificationProvider, { useNotifications } from "./notifications/NotificationProvider";
import NotificationsPopup from "./components/NotificationsPopup";
import "./styles.css";

function createAppTheme(isDarkMode) {
  return createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      primary: { main: "#7a67de" },
      background: {
        default: isDarkMode ? "#17191d" : "#ffffff",
        paper: isDarkMode ? "#292d33" : "#dfe2e7",
      },
      text: {
        primary: isDarkMode ? "#f1f3f5" : "#1b1f2d",
        secondary: isDarkMode ? "#b8bec8" : "#4d5874",
      },
    },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.04em" },
    h3: { fontWeight: 800, letterSpacing: "-0.03em" },
  },
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: "#dfe2e7",
          boxShadow: "none",
          borderRadius: "0px !important",
          border: "1px solid #111111",
          overflow: "hidden",
          margin: "0 !important",
          "&:before": { display: "none" },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: "64px",
          padding: "0 18px",
          "&.Mui-expanded": { minHeight: "64px" },
        },
        content: {
          margin: "18px 0",
          "&.Mui-expanded": { margin: "18px 0" },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          background: "rgba(255,255,255,0.08)",
          padding: "0 18px 18px",
          color: "#1b1f2d",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "0px",
          textTransform: "none",
          fontWeight: 700,
          padding: "12px 22px",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
          backgroundColor: "#d5d7dc",
          color: "#1a1d26",
          "&:hover": { backgroundColor: "#c8cbd0" },
        },
      },
    },
  },
  });
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeBusy, setThemeBusy] = useState(true);
  const [themeError, setThemeError] = useState(null);
  const { collectionWarning, storageWarning } = useNotifications();
  const theme = useMemo(() => createAppTheme(isDarkMode), [isDarkMode]);

  useEffect(() => {
    let active = true;
    window.onionManager.getTheme().then((result) => {
      if (active) setIsDarkMode(result.darkMode);
    }).catch((error) => {
      if (active) setThemeError(`Unable to load theme preference: ${error.message}`);
    }).finally(() => { if (active) setThemeBusy(false); });
    return () => { active = false; };
  }, []);

  async function toggleTheme() {
    if (themeBusy) return;
    const next = !isDarkMode;
    setThemeBusy(true);
    setThemeError(null);
    setIsDarkMode(next);
    try { await window.onionManager.saveTheme(next); }
    catch (error) { setThemeError(`Theme changed for this session, but could not be saved: ${error.message}`); }
    finally { setThemeBusy(false); }
  }

  return (
    <ThemeProvider theme={theme}>
      <main className={`app-shell${isDarkMode ? " dark-mode" : ""}`}>
        <Box className="content-panel">
          <header className="page-header">
            <Box>
              <Typography component="h1" variant="h2" className="page-title">
                OnionManager
              </Typography>
              <Typography className="page-subtitle">
                System configuration and vulnerability analysis
              </Typography>
            </Box>
            <Box className="header-actions">
              <SettingsPopup />
              <IconButton
                className="theme-toggle"
                onClick={toggleTheme}
                disabled={themeBusy}
                aria-pressed={isDarkMode}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
              <NotificationsPopup />
            </Box>
          </header>
          {collectionWarning && <Alert severity="warning" sx={{ mb: 2 }}>{collectionWarning}</Alert>}
          {storageWarning && <Alert severity="warning" sx={{ mb: 2 }}>{storageWarning}</Alert>}
          {themeError && <Alert severity="warning" sx={{ mb: 2 }}>{themeError}</Alert>}
          <OnionS />
          <Vulnerabilities />
        </Box>
      </main>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationProvider><App /></NotificationProvider>
  </React.StrictMode>,
);
