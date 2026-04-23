// src/config/env.js
const requiredVars = {
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
};

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Create a .env.local file with this variable set. ` +
      `See README.md for setup instructions.`
    );
  }
}

export const ENV = {
  googleClientId: requiredVars.VITE_GOOGLE_CLIENT_ID,
};
