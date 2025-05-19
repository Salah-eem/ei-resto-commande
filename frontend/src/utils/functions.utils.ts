  // Capitalize the first letter of each word
  export const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };