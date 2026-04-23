import { ENV } from './env.js';

export const GOOGLE_CONFIG = {
  clientId: ENV.googleClientId,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
};
