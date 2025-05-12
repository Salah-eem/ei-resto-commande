import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Autocomplete, TextField } from '@mui/material';

interface Props {
  label?: string;
  onSelect: (address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    lat: number;
    lng: number;
  }) => void;
}

const NominatimAutocomplete: React.FC<Props> = ({ label = 'Adresse', onSelect }) => {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<any[]>([]);

  useEffect(() => {
    if (input.length < 3) return;

    const fetch = async () => {
      try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: input,
            format: 'json',
            addressdetails: 1,
            countrycodes: 'be', // 🇧🇪 Filtre uniquement Belgique
            limit: 5,
          },
        });
        setOptions(res.data || []);
      } catch (err) {
        console.error('Erreur Nominatim :', err);
      }
    };

    const timeout = setTimeout(fetch, 400);
    return () => clearTimeout(timeout);
  }, [input]);

  return (
    <Autocomplete
      freeSolo
      fullWidth
      options={options}
      getOptionLabel={(option) => option.display_name || ''}
      onInputChange={(_, value) => setInput(value)}
      onChange={(_, value) => {
        if (!value || !value.address) return;

        const addr = value.address;

        onSelect({
          street: addr.road || addr.pedestrian || addr.footway || '',
          city: addr.city || addr.town || addr.village || '',
          postalCode: addr.postcode || '',
          country: addr.country || '',
          lat: parseFloat(value.lat),
          lng: parseFloat(value.lon),
        });
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} fullWidth />
      )}
    />
  );
};

export default NominatimAutocomplete;
