import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import ActionButton from "./ActionButton";
import LayerAccordionTable, { LAYER_ORDER } from "./LayerAccordionTable";
import TableSearch from "./TableSearch";
import { groupVulnerabilities } from "../search/filter.mjs";

export default function Vulnerabilities() {
  const [status, setStatus] = useState("Vulnerability scanning is not available yet.");
  const [query, setQuery] = useState("");
  const [findings, setFindings] = useState(null);
  const placeholderVulnerabilities = useMemo(
    () => findings === null ? Object.fromEntries(LAYER_ORDER.map((layer) => [layer, null])) : groupVulnerabilities(findings),
    [findings],
  );
  useEffect(() => {
    let active = true;
    if (import.meta.env.DEV) {
      import("../fixtures/vulnerabilities.mjs").then(({ default: mock }) => {
        if (active) setFindings(mock);
      }).catch(() => { if (active) setStatus("Unable to load development demo data. Scanning is not available yet."); });
    }
    return () => { active = false; };
  }, []);

  function scanForVulnerabilities() {
    setStatus("Vulnerability scanning will be connected when the database is available.");
  }

  return (
    <section className="section-block" aria-labelledby="vulnerabilities-heading">
      <Box className="section-card">
        <Box className="section-heading">
          <Typography
            id="vulnerabilities-heading"
            component="h2"
            variant="h5"
            className="section-title"
          >
            Vulnerabilities
          </Typography>
          <Typography className="section-subtitle">
            Known vulnerabilities detected across system components
          </Typography>
        </Box>
        {import.meta.env.DEV && <Alert severity="info" sx={{ mb: 2 }}>
          Development demo data — not findings from this device.
        </Alert>}
        <TableSearch label="Search vulnerabilities" value={query} onChange={setQuery} />
        <LayerAccordionTable
          data={placeholderVulnerabilities}
          query={query}
          kind="vulnerabilities"
          emptyMessage="No vulnerability data available."
        />
        <Stack direction="row" justifyContent="flex-end" className="action-row">
          <ActionButton disabled={import.meta.env.DEV} onClick={scanForVulnerabilities}>
            Scan for Vulnerabilities
          </ActionButton>
        </Stack>
        <Typography className="section-status" role="status">
          {status}
        </Typography>
      </Box>
    </section>
  );
}
