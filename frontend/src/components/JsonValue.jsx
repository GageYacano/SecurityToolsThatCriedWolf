import React from "react";
import { Box, Typography } from "@mui/material";

import { formatLabel, isNameVersionTable } from "../search/filter.mjs";
import { nameVersionRowKeys } from "../search/rowKeys.mjs";
export { formatLabel } from "../search/filter.mjs";

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

    const isLibraryTable = isNameVersionTable(value);

    if (isLibraryTable) {
      const rowKeys = nameVersionRowKeys(value);
      return (
        <Box className="library-table-wrap">
          <Box className="library-table-header">
            <Typography className="library-table-label">Name</Typography>
            <Typography className="library-table-label">Version</Typography>
          </Box>
          {value.map((item, index) => (
            <Box
              key={rowKeys[index]}
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
