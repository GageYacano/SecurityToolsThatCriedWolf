import React, { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ActionButton from "./ActionButton";
import LayerAccordionTable, { LAYER_ORDER } from "./LayerAccordionTable";

export default function Vulnerabilities() {
  const [status, setStatus] = useState("Vulnerability scanning is not available yet.");
  const placeholderVulnerabilities = useMemo(
    () => Object.fromEntries(LAYER_ORDER.map((layer) => [layer, null])),
    [],
  );

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
        <LayerAccordionTable
          data={placeholderVulnerabilities}
          emptyMessage="No vulnerability data available."
        />
        <Stack direction="row" justifyContent="flex-end" className="action-row">
          <ActionButton onClick={scanForVulnerabilities}>
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
