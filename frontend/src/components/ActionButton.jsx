import React from "react";
import { Button, CircularProgress } from "@mui/material";

export default function ActionButton({ children, isLoading = false, onClick, disabled = false }) {
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={onClick}
      disabled={disabled || isLoading}
      sx={{
        minWidth: 190,
        opacity: isLoading ? 0.7 : 1,
        cursor: isLoading ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      {isLoading && <CircularProgress size={16} thickness={5} color="inherit" />}
      <span>{children}</span>
    </Button>
  );
}
