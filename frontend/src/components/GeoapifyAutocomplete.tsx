import React, { useState, useEffect } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";

interface Props {
  value: string;
  onSelect: (address: string, city: string, postalCode: string, lat: number, lng: number, country: string) => void;
  error?: boolean;
  helperText?: string | boolean;
}

const GeoapifyAutocomplete: React.FC<Props> = ({ value, onSelect, error, helperText }) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          input
        )}&limit=5&apiKey=${process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY}`
      );
      const data = await res.json();
      setOptions(data.features || []);
    } catch (err) {
      console.error("Geoapify error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (value && !options.find((o) => o.properties?.formatted === value)) {
      setOptions((prev) => [{ properties: { formatted: value } }, ...prev]);
    }
  }, [value]);

  const handleSelect = (option: any) => {
    const address = option.properties.formatted;
    const city = option.properties.city || option.properties.town || option.properties.village || "";
    const postalCode = option.properties.postcode || "";
    const lat = option.geometry.coordinates[1]; // Geoapify format: [lng, lat]
    const lng = option.geometry.coordinates[0];
    const country = option.properties.country || "";
    onSelect(address, city, postalCode, lat, lng, country);
  };

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(option) => option.properties?.formatted || ""}
      isOptionEqualToValue={(option, val) => option.properties?.formatted === val.properties?.formatted}
      onInputChange={(_, newInputValue) => fetchSuggestions(newInputValue)}
      onChange={(_, newValue) => {
        if (newValue) handleSelect(newValue);
        else onSelect("", "", "", 0, 0, ""); // Clear case
      }}
      value={
        value
          ? options.find((o) => o.properties?.formatted === value) || { properties: { formatted: value } }
          : null
      }
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Address"
          fullWidth
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default GeoapifyAutocomplete;
