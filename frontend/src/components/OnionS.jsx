import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ActionButton from "./ActionButton";
import LayerAccordionTable from "./LayerAccordionTable";

export default function OnionS() {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("Loading saved configuration...");
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef(0);
  const collectingRef = useRef(false);
  const savedTimestampRef = useRef(null);
  const readingRef = useRef(false);

  useEffect(() => {
    async function loadSaved() {
      if (collectingRef.current || readingRef.current || document.visibilityState === "hidden") return;
      readingRef.current = true;
      const request = ++requestRef.current;
      try {
        const result = await window.onionManager.readSnapshot();
        if (request !== requestRef.current) return;
        if (result.status === "found") {
          if (savedTimestampRef.current !== result.snapshot.collectedAt) {
            savedTimestampRef.current = result.snapshot.collectedAt;
            setSnapshot(result.snapshot);
            setStatus("Saved configuration loaded.");
          }
        } else if (result.status === "error") {
          setStatus(result.message);
        } else {
          setStatus("No saved configuration found. Select Get OnionS to collect it.");
        }
      } catch (error) {
        if (request === requestRef.current) setStatus(`Unable to load saved configuration: ${error.message}`);
      } finally {
        readingRef.current = false;
      }
    }
    // A microtask lets React StrictMode finish its initial effect cleanup first.
    let active = true;
    Promise.resolve().then(() => { if (active) loadSaved(); });
    const interval = window.setInterval(loadSaved, 30000);
    window.addEventListener("focus", loadSaved);
    document.addEventListener("visibilitychange", loadSaved);
    return () => {
      active = false;
      ++requestRef.current;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadSaved);
      window.removeEventListener("focus", loadSaved);
    };
  }, []);

  async function runOnionManager() {
    if (collectingRef.current) return;
    collectingRef.current = true;
    const request = ++requestRef.current;
    setStatus("Collecting system configuration...");
    setIsLoading(true);
    try {
      const result = await window.onionManager.run();
      if (request !== requestRef.current) return;
      if (result.status === "success") {
        savedTimestampRef.current = result.snapshot.collectedAt;
        setSnapshot(result.snapshot);
        const partial = Object.values(result.snapshot.config).some((layer) => layer?.error);
        setStatus(partial ? "Configuration saved. Some layers could not be collected; see their details." : "Configuration saved.");
      } else {
        setStatus(result.message);
      }
    } catch (error) {
      if (request === requestRef.current) setStatus(`Unable to collect configuration: ${error.message}`);
    } finally {
      collectingRef.current = false;
      if (request === requestRef.current) setIsLoading(false);
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
          {snapshot && (
            <Typography className="section-subtitle">
              Last collected: {new Date(snapshot.collectedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
        <LayerAccordionTable data={snapshot?.config} emptyMessage="No system configuration loaded." />
        <Stack direction="row" justifyContent="flex-end" className="action-row">
          <ActionButton isLoading={isLoading} onClick={runOnionManager}>
            Get OnionS
          </ActionButton>
        </Stack>
        {/*<Typography className="section-status" role="status">{status}</Typography>*/}
      </Box>
    </section>
  );
}
