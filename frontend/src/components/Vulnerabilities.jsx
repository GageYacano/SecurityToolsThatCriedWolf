import React, { useMemo, useState } from "react";
import { Stack, Typography } from "@mui/material";
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
      <Typography
        id="vulnerabilities-heading"
        component="h4"
        variant="h4"
        className="section-title"
      >
        Vulnerabilities
      </Typography>
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
    </section>
  );
}
