import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { api } from "./api-client";
import type { AuthTokens, User } from "@/types/api";

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch {
    return Date.now();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedTokens = localStorage.getItem("auth_tokens");

      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);

        if (parsedTokens.expiresAt > Date.now()) {
          console.log(
            "[AuthProvider] Access token is still valid, using existing token",
          );
          setTokens(parsedTokens);

          try {
            const userData = await api.get<User>("/users/me");
            setUser(userData);
            console.log("[AuthProvider] User data loaded successfully");
          } catch (error) {
            console.error("[AuthProvider] Failed to fetch user data:", error);
            localStorage.removeItem("auth_tokens");
          }
        } else if (parsedTokens.refresh) {
          console.log(
            "[AuthProvider] Access token expired, attempting refresh...",
          );
          try {
            const refreshData = await api.post<{
              access: string;
              refresh: string;
            }>("/token/refresh", { refresh: parsedTokens.refresh });
            const expiresAt = getTokenExpiry(refreshData.access);
            const newTokens: AuthTokens = {
              access: refreshData.access,
              refresh: refreshData.refresh,
              expires_at: expiresAt,
            };

            setTokens(newTokens);
            localStorage.setItem("auth_tokens", JSON.stringify(newTokens));
            console.log(
              "[AuthProvider] Token refresh successful! New expiry:",
              new Date(expiresAt).toLocaleString(),
            );

            const userData = await api.get<User>("/users/me");
            setUser(userData);
            console.log("[AuthProvider] User data loaded after token refresh");
          } catch (error) {
            console.error("[AuthProvider] Token refresh failed:", error);
            localStorage.removeItem("auth_tokens");
          }
        } else {
          console.log(
            "[AuthProvider] No refresh token available, clearing tokens",
          );
          localStorage.removeItem("auth_tokens");
        }
      } else {
        console.log("[AuthProvider] No stored tokens found");
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    console.log("[AuthProvider] Logging in user:", username);
    const data = await api.post<{
      username: string;
      access: string;
      refresh: string;
    }>("/token/pair", { username, password });

    const expiresAt = getTokenExpiry(data.access);

    const authTokens: AuthTokens = {
      access: data.access,
      refresh: data.refresh,
      expires_at: expiresAt,
    };

    setTokens(authTokens);
    localStorage.setItem("auth_tokens", JSON.stringify(authTokens));
    console.log(
      "[AuthProvider] Login successful! Token expires:",
      new Date(expiresAt).toLocaleString(),
    );

    const userData = await api.get<User>("/users/me");
    setUser(userData);
    console.log("[AuthProvider] User data loaded after login");
  };

  const logout = () => {
    console.log("[AuthProvider] Logging out user");
    setUser(null);
    setTokens(null);
    localStorage.removeItem("auth_tokens");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        logout,
        isAuthenticated: !!user && !!tokens,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
