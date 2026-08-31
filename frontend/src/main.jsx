import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Stack,
  Typography,
  Box,
  CircularProgress,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./styles.css";

const LAYER_ORDER = ["hardware", "firmware", "os", "libraries", "applications"];

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7a67de",
    },
    background: {
      default: "#ffffff",
      paper: "#dfe2e7",
    },
    text: {
      primary: "#1b1f2d",
      secondary: "#4d5874",
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
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
          "&:before": {
            display: "none",
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: "64px",
          padding: "0 18px",
          "&.Mui-expanded": {
            minHeight: "64px",
          },
        },
        content: {
          margin: "18px 0",
          "&.Mui-expanded": {
            margin: "18px 0",
          },
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
          "&:hover": {
            backgroundColor: "#c8cbd0",
          },
        },
      },
    },
  },
});

function parseSystemConfig(rawText) {
  if (!rawText) return null;

  const trimmed = rawText.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderValue(value) {
  if (value === null || value === undefined) {
    return <span className="json-null">null</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="json-scalar">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="json-empty">[]</span>;
    }

    return (
      <Box className="json-array">
        {value.map((item, index) => (
          <Box key={`${index}-${JSON.stringify(item)}`} className="json-array-item">
            {renderValue(item)}
          </Box>
        ))}
      </Box>
    );
  }

  const entries = Object.entries(value || {});
  if (!entries.length) {
    return <span className="json-empty">{}</span>;
  }

  return (
    <Box className="json-object">
      {entries.map(([key, nestedValue]) => (
        <Box key={key} className="json-field">
          <Typography className="json-field-label">{formatLabel(key)}</Typography>
          <Box className="json-field-value">{renderValue(nestedValue)}</Box>
        </Box>
      ))}
    </Box>
  );
}

function App() {
  const [output, setOutput] = useState("");
  const [systemConfig, setSystemConfig] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ hardware: true });

  useEffect(() => {
    const unsubscribe = window.onionManager.onOutput(({ stream, text }) => {
      if (stream === "stdout") {
        setOutput((current) => {
          const combined = `${current}${text}`;
          const parsed = parseSystemConfig(combined);
          if (parsed) {
            setSystemConfig(parsed);
            setStatus("System config loaded");
            setIsLoading(false);
          }
          return combined;
        });
      } else if (stream === "status") {
        setStatus(text.trim());
        if (text.toLowerCase().includes("process exited")) {
          setIsLoading(false);
        }
      } else if (stream === "stderr") {
        setStatus("Error while collecting system config");
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const orderedSections = useMemo(() => {
    if (!systemConfig) {
      return [];
    }

    return LAYER_ORDER.filter((key) => key in systemConfig).map((key) => [key, systemConfig[key]]);
  }, [systemConfig]);

  async function runOnionManager() {
    if (isLoading) return;

    setOutput("");
    setSystemConfig(null);
    setStatus("Loading system config...");
    setIsLoading(true);

    const result = await window.onionManager.run();
    if (!result.started) {
      setStatus(result.message);
      setIsLoading(false);
    }
  }

  const visibleSections = orderedSections.length ? orderedSections : [
    ["hardware", null],
    ["firmware", null],
    ["os", null],
    ["libraries", null],
    ["applications", null],
  ];

  return (
    <ThemeProvider theme={theme}>
      <main className="app-shell">

        <Box className="content-panel">
          <Box className="heading-row">
            <Typography component="h4" variant="h4" className="page-title" sx={{mb: 2}}>OnionS</Typography>
          </Box>

          {/*<Box className="status-row">*/}
          {/*  <Typography sx={{ fontWeight: 600 }}>Status:</Typography>*/}
          {/*  <Typography sx={{ ml: 1, color: "#3a4054" }}>{status}</Typography>*/}
          {/*</Box>*/}

          <Box className="accordion-stack">
            {visibleSections.map(([key, value]) => {
              const isExpanded = !!expandedSections[key];
              return (
                <Accordion
                  key={key}
                  expanded={isExpanded}
                  TransitionProps={{ timeout: 0 }}
                  onChange={() => setExpandedSections((current) => ({ ...current, [key]: !current[key] }))}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>{formatLabel(key)}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {value !== null ? renderValue(value) : null}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={runOnionManager}
            disabled={isLoading}
            sx={{
              mt: 2,
              minWidth: 170,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            {isLoading && <CircularProgress size={16} thickness={5} color="inherit" />}
            <span>Get OnionS</span>
          </Button>

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
