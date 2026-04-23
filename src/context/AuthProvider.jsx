import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CONFIG } from '../config/google';
import { AuthContextProvider } from './AuthContext';

export default function AuthProvider({ children }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CONFIG.clientId}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </GoogleOAuthProvider>
  );
}
