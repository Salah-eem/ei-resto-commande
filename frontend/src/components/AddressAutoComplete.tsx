"use client";
import React, { useState, useEffect } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import axios from "axios";

interface Suggestion {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

interface AddressAutocompleteProps {
  label: string;
  onSelect: (value: { address: string; city?: string; postalCode?: string }) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ label, onSelect }) => {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch suggestions from OpenStreetMap Nominatim
  const fetchSuggestions = async (input: string) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
          input
        )}&limit=5`
      );
      setOptions(data);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputValue.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        fetchSuggestions(inputValue);
      }, 500); // debounce to reduce API calls
      return () => clearTimeout(delayDebounceFn);
    } else {
      setOptions([]);
    }
  }, [inputValue]);

  const handleSelect = (option: Suggestion | null) => {
    if (option) {
      const city = option.address.city || option.address.town || option.address.village || "";
      const postalCode = option.address.postcode || "";
      const address = option.display_name;
      onSelect({ address, city, postalCode });
    }
  };

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.display_name)}
      filterOptions={(x) => x} // Disable client-side filtering
      loading={loading}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(_, newValue) => {
        handleSelect(newValue as Suggestion);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default AddressAutocomplete;
