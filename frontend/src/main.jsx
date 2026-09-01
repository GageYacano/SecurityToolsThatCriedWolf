import React from "react";
import { createRoot } from "react-dom/client";
import { Box, ThemeProvider, createTheme } from "@mui/material";
import OnionS from "./components/OnionS";
import Vulnerabilities from "./components/Vulnerabilities";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7a67de" },
    background: { default: "#ffffff", paper: "#dfe2e7" },
    text: { primary: "#1b1f2d", secondary: "#4d5874" },
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <main className="app-shell">
        <Box className="content-panel">
          <OnionS />
          <Vulnerabilities />
        </Box>
      </main>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
