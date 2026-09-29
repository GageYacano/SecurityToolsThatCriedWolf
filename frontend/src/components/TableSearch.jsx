import React from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

export default function TableSearch({ label, value, onChange }) {
  return <TextField label={label} value={value} onChange={(event) => onChange(event.target.value)}
    fullWidth size="small" sx={{ mb: 2 }} slotProps={{ input: {
      startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
      endAdornment: value ? <InputAdornment position="end">
        <IconButton size="small" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange("")}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </InputAdornment> : null,
    } }} />;
}
