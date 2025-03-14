'use client';
import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Category } from '@/types/category';

interface CategoryNavProps {
  categories: Category[];
  onCategoryChange: (category: Category) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({ categories, onCategoryChange }) => {
  // On initialise la sélection avec le nom de la première catégorie (du tableau trié)
  const [selectedCategoryName, setSelectedCategoryName] = useState(categories[0]?.name || '');

  const handleChange = (_event: React.SyntheticEvent, newCategoryName: string) => {
    setSelectedCategoryName(newCategoryName);
    const selectedCategory = categories.find((cat) => cat.name === newCategoryName);
    if (selectedCategory) {
      onCategoryChange(selectedCategory);
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
