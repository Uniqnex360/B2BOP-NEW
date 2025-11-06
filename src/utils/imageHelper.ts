// Helper function to get a valid image URL or fallback placeholder
export const getImageUrl = (imageUrl: string | null | undefined, productName?: string): string => {
  // If valid URL provided, use it
  if (imageUrl && imageUrl.trim()) {
    return imageUrl;
  }

  // Use a placeholder image from a reliable CDN
  // Using placeholder.com which provides reliable placeholder images
  const encodedName = productName ? encodeURIComponent(productName) : 'Product';
  return `https://via.placeholder.com/400x400/e2e8f0/64748b?text=${encodedName}`;
};

// Helper to check if image URL is valid
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || !url.trim()) return false;

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Handle image loading errors
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, productName?: string) => {
  const target = e.target as HTMLImageElement;
  const encodedName = productName ? encodeURIComponent(productName) : 'Product';
  target.src = `https://via.placeholder.com/400x400/e2e8f0/64748b?text=${encodedName}`;
};
