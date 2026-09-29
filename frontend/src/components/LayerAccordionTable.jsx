import React, { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatLabel, renderValue } from "./JsonValue";
import VulnerabilityRecords from "./VulnerabilityRecords";
import { LAYER_ORDER, filterLayer, normalizeQuery } from "../search/filter.mjs";

export { LAYER_ORDER } from "../search/filter.mjs";

export default function LayerAccordionTable({ data, emptyMessage, query = "", kind = "specs" }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [searchExpansion, setSearchExpansion] = useState(null);
  const normalized = normalizeQuery(query);
  useEffect(() => { setSearchExpansion(null); }, [normalized, data]);
  const sections = useMemo(
    () => LAYER_ORDER.map((key) => [key, filterLayer(data?.[key] ?? null, normalized, kind)]),
    [data, normalized, kind],
  );
  const defaults = Object.fromEntries(sections.map(([key, result]) => [key, result.count > 0 || result.preserve]));
  const expanded = !normalized ? expandedSections :
    searchExpansion?.query === normalized && searchExpansion?.data === data ? searchExpansion.expanded : defaults;

  function toggleSection(key) {
    if (normalized) {
      setSearchExpansion({ query: normalized, data, expanded: { ...expanded, [key]: !expanded[key] } });
      return;
    }
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Box className="accordion-stack">
      {sections.map(([key, { value, count, preserve }]) => (
        <Accordion
          key={key}
          expanded={!!expanded[key]}
          TransitionProps={{ timeout: 0 }}
          onChange={() => toggleSection(key)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>
              {formatLabel(key)}
              {normalized && !preserve && <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                {count} matching {count === 1 ? "entry" : "entries"}
              </Typography>}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {value === null ? (
              <Typography className="placeholder-message">{emptyMessage}</Typography>
            ) : normalized && !preserve && count === 0 ? (
              <Typography className="placeholder-message">No matching entries</Typography>
            ) : kind === "vulnerabilities" && Array.isArray(value) ? (
              value.length ? <VulnerabilityRecords findings={value} /> :
                <Typography className="placeholder-message">No vulnerability findings in this layer.</Typography>
            ) : (
              renderValue(value)
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
