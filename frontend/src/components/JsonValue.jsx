import React from "react";
import { Box, Typography } from "@mui/material";

export function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function renderValue(value) {
  if (value === null || value === undefined) {
    return <span className="json-null">null</span>;
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return <span className="json-scalar">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="json-empty">[]</span>;
    }

    const isLibraryTable = value.every(
      (item) => item && typeof item === "object" && "name" in item && "version" in item,
    );

    if (isLibraryTable) {
      return (
        <Box className="library-table-wrap">
          <Box className="library-table-header">
            <Typography className="library-table-label">Name</Typography>
            <Typography className="library-table-label">Version</Typography>
          </Box>
          {value.map((item, index) => (
            <Box
              key={`${item.name ?? index}-${item.version ?? "unknown"}`}
              className="library-table-row"
            >
              <Typography className="library-table-name">{item.name ?? ""}</Typography>
              <Typography className="library-table-version">{item.version ?? ""}</Typography>
            </Box>
          ))}
        </Box>
      );
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

  const entries = Object.entries(value);
  if (!entries.length) {
    return <span className="json-empty">{"{}"}</span>;
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
