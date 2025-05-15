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
      // Construction de l’URL avec filtrage sur la Belgique
      const url = new URL(
        'https://api.geoapify.com/v1/geocode/autocomplete'
      );
      url.searchParams.set('text', input);
      url.searchParams.set('limit', '5');
      url.searchParams.set('filter', 'countrycode:be');
      url.searchParams.set('lang', 'fr');  
      url.searchParams.set('apiKey', process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY!);

      const res = await fetch(url.toString());
      const data = await res.json();

      // Nettoyer les adresses suggérées
      const cleanedOptions = (data.features || []).filter((feature: any) => {
        const props = feature.properties;
        return props.formatted && props.city && props.postcode; // Exclure les adresses incomplètes
      });

      setOptions(cleanedOptions);
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

  /*const handleSelect = (option: any) => {
    const address = option.properties.formatted;
    const city = option.properties.city || option.properties.town || option.properties.village || "";
    const postalCode = option.properties.postcode || "";
    const lat = option.geometry.coordinates[1]; // Geoapify format: [lng, lat]
    const lng = option.geometry.coordinates[0];
    const country = option.properties.country || "";
    onSelect(address, city, postalCode, lat, lng, country);
  };*/
  const handleSelect = (option: any) => {
        let address = option.properties.formatted;
        // On ne garde que la rue + numéro
        const props = option.properties;
        const streetName   = props.street || ''; 
        const houseNumber  = props.housenumber || props.house_number || '';
        address      = `${streetName}${houseNumber ? ' ' + houseNumber : ''}`.trim();
    
        const city       = props.city || props.town || props.village || '';
        const postalCode = props.postcode || '';
        const lat        = option.geometry.coordinates[1];
        const lng        = option.geometry.coordinates[0];
        const country    = props.country || '';
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
