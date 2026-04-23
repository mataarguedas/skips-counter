import { createContext, useContext, useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GOOGLE_CONFIG } from '../config/google';

export const AuthContext = createContext(null);

export function AuthContextProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  async function fetchUserInfo(token) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('userinfo fetch failed');
      const data = await res.json();
      setUserInfo({ name: data.name, email: data.email, picture: data.picture });
    } catch {
      setAccessToken(null);
      setAuthError('Sign-in failed or was cancelled. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const ERROR_MESSAGE = 'Sign-in failed or was cancelled. Please try again.';

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: GOOGLE_CONFIG.scopes.join(' '),
    onSuccess: (response) => {
      setAccessToken(response.access_token);
      fetchUserInfo(response.access_token);
    },
    onError: () => {
      setAuthError(ERROR_MESSAGE);
      setIsLoading(false);
    },
    onNonOAuthError: () => {
      setAuthError(ERROR_MESSAGE);
      setIsLoading(false);
    },
  });

  function login() {
    setAuthError(null);
    setIsLoading(true);
    googleLogin();
  }

  function logout() {
    setAccessToken(null);
    setUserInfo(null);
    setAuthError(null);
    setIsLoading(false);
  }

  // Proactively log out 5 minutes before the 1-hour implicit token expiry.
  useEffect(() => {
    if (!accessToken) return;
    const timer = setTimeout(logout, 55 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        userInfo,
        login,
        logout,
        isAuthenticated: accessToken !== null,
        isLoading,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
