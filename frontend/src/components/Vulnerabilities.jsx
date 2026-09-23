import React, { useEffect, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import LayerAccordionTable, { LAYER_ORDER } from "./LayerAccordionTable";

export default function Vulnerabilities() {
  const [matches, setMatches] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("Collect system information with Get OnionS to scan for possible vulnerabilities.");

  useEffect(() => {
    async function scan(event) {
      setIsScanning(true);
      setStatus("Comparing collected system information with the CVE database...");
      try {
        const results = await window.onionManager.scanVulnerabilities(event.detail);
        setMatches(results);
        setStatus(results.length ? `${results.length} possible vulnerability match${results.length === 1 ? "" : "es"} found.` : "No possible vulnerability matches found.");
      } catch (error) {
        setStatus(`Vulnerability scan unavailable: ${error.message}`);
      } finally {
        setIsScanning(false);
      }
    }
    window.addEventListener("onionmanager:configuration-collected", scan);
    return () => window.removeEventListener("onionmanager:configuration-collected", scan);
  }, []);

  const grouped = Object.fromEntries(LAYER_ORDER.map((layer) => [
    layer,
    matches?.filter((record) => record.layer_affected.toLowerCase() === layer) || null,
  ]));

  return (
    <section className="section-block" aria-labelledby="vulnerabilities-heading">
      <Box className="section-card">
        <Box className="section-heading">
          <Typography id="vulnerabilities-heading" component="h2" variant="h5" className="section-title">
            Vulnerability scan
          </Typography>
          <Typography className="section-subtitle">
            Possible matches based on this device's collected system information
          </Typography>
        </Box>
        {matches?.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>These are possible matches for investigation, not confirmed vulnerabilities.</Alert>}
        {matches !== null && <LayerAccordionTable data={grouped} emptyMessage="No possible matches in this layer." />}
        {isScanning && <Typography className="section-status">Scanning the latest collection...</Typography>}
        <Typography className="section-status" role="status">{status}</Typography>
      </Box>
    </section>
  );
}
