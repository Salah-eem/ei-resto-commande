'use client';
import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Category } from '@/types/category';

interface CategoryNavProps {
  categories: Category[];
  onCategoryChange: (category: Category) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({ categories, onCategoryChange }) => {
  // Initialisation avec une valeur primitive : le nom de la catégorie
  const [selectedCategoryName, setSelectedCategoryName] = useState(categories[0]?.name || '');

  const handleChange = (_event: React.SyntheticEvent, newCategoryName: string) => {
    setSelectedCategoryName(newCategoryName);

    // Trouver l'objet Category correspondant à partir du nom sélectionné
    const selectedCategoryObject = categories.find((category) => category.name === newCategoryName);
    if (selectedCategoryObject) {
      onCategoryChange(selectedCategoryObject);
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={selectedCategoryName}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map((category) => (
          <Tab key={category._id} label={category.name} value={category.name} />
        ))}
      </Tabs>
    </Box>
  );
};

export default CategoryNav;
