import React, { useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatLabel, renderValue } from "./JsonValue";

export const LAYER_ORDER = ["hardware", "firmware", "os", "libraries", "applications"];

export default function LayerAccordionTable({ data, emptyMessage }) {
  const [expandedSections, setExpandedSections] = useState({});
  const sections = useMemo(
    () => LAYER_ORDER.map((key) => [key, data?.[key] ?? null]),
    [data],
  );

  function toggleSection(key) {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Box className="accordion-stack">
      {sections.map(([key, value]) => (
        <Accordion
          key={key}
          expanded={!!expandedSections[key]}
          TransitionProps={{ timeout: 0 }}
          onChange={() => toggleSection(key)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>
              {formatLabel(key)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {value === null ? (
              <Typography className="placeholder-message">{emptyMessage}</Typography>
            ) : (
              renderValue(value)
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
