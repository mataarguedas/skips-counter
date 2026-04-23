// src/config/google.js
export const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
};
