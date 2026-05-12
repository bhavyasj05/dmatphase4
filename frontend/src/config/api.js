const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'https://dmat-backend.onrender.com',
);

export const API_URL = `${API_BASE_URL}/api`;

export const getNetworkErrorMessage = (error) => {
  if (error?.name === 'TypeError' && /fetch/i.test(error.message || '')) {
    return `Cannot reach the backend API at ${API_BASE_URL}. Check Render service status and CORS settings.`;
  }

  if (error?.code === 'ERR_NETWORK') {
    return `Cannot reach the backend API at ${API_BASE_URL}. Check Render service status and CORS settings.`;
  }

  return error?.message || 'Request failed. Please try again.';
};
