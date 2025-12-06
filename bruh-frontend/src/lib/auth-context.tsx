import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";
import type { AuthTokens, User } from "@/types/api";

interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
  const queryClient = useQueryClient();
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use TanStack Query to fetch and cache user data
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      console.log("[AuthProvider] Fetching user data...");
      const userData = await api.get<User>("/users/me");
      console.log("[AuthProvider] User data fetched successfully");
      return userData;
    },
    enabled: !!tokens && isInitialized, // Only fetch when we have tokens
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: false,
  });

  const refreshUser = useCallback(async () => {
    console.log("[AuthProvider] Invalidating user cache...");
    await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  }, [queryClient]);

  useEffect(() => {
    const loadUser = async () => {
      const storedTokens = localStorage.getItem("auth_tokens");

      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);

        if (parsedTokens.expires_at > Date.now()) {
          console.log(
            "[AuthProvider] Access token is still valid, using existing token",
          );
          setTokens(parsedTokens);
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

      setIsInitialized(true);
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

    // Invalidate and refetch user data
    await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  };

  const register = async (data: RegisterData) => {
    console.log("[AuthProvider] Registering new user:", data.username);
    try {
      await api.post("/auth/register", data);
      console.log("[AuthProvider] Registration successful!");
    } catch (error: any) {
      console.error("[AuthProvider] Registration failed:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log("[AuthProvider] Logging out user");
    setTokens(null);
    localStorage.removeItem("auth_tokens");
    queryClient.setQueryData(["auth", "user"], null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        tokens,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user && !!tokens,
        isLoading: !isInitialized || isUserLoading,
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
