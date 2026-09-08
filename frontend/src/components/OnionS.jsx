import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ActionButton from "./ActionButton";
import LayerAccordionTable from "./LayerAccordionTable";

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

export default function OnionS() {
  const outputRef = useRef("");
  const [systemConfig, setSystemConfig] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = window.onionManager.onOutput(({ stream, text }) => {
      if (stream === "stdout") {
        outputRef.current += text;
        const parsed = parseSystemConfig(outputRef.current);
        if (parsed) {
          setSystemConfig(parsed);
          setStatus("System config loaded");
          setIsLoading(false);
        }
      } else if (stream === "status") {
        setStatus(text.trim());
        if (text.toLowerCase().includes("process exited")) {
          setIsLoading(false);
        }
      } else if (stream === "stderr") {
        // Diagnostics do not mean collection has finished; wait for JSON or exit.
        setStatus("Backend reported diagnostics while collecting system config");
      }
    });

    return unsubscribe;
  }, []);

  async function runOnionManager() {
    if (isLoading) return;

    outputRef.current = "";
    setSystemConfig(null);
    setStatus("Loading system config...");
    setIsLoading(true);

    try {
      const result = await window.onionManager.run();
      if (!result.started) {
        setStatus(result.message);
        setIsLoading(false);
      }
    } catch (error) {
      setStatus(`Unable to start OnionManager: ${error.message}`);
      setIsLoading(false);
    }
  }

  return (
    <section className="section-block" aria-labelledby="inventory-heading">
      <Box className="section-card">
        <Box className="section-heading">
          <Typography id="inventory-heading" component="h2" variant="h5" className="section-title">
            OnionS
          </Typography>
          <Typography className="section-subtitle">
            Components detected on this device organized by layers
          </Typography>
        </Box>
        <LayerAccordionTable data={systemConfig} emptyMessage="No system configuration loaded." />
        <Stack direction="row" justifyContent="flex-end" className="action-row">
          <ActionButton isLoading={isLoading} onClick={runOnionManager}>
            Get OnionS
          </ActionButton>
        </Stack>
      </Box>
    </section>
  );
}
