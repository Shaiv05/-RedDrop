import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/auth";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "hospital";
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const token = rawToken?.trim();

    if (!token || token.toLowerCase() === "undefined" || token.toLowerCase() === "null") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (token !== rawToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    const loadCurrentUser = async () => {
      try {
        const res = await fetch(apiUrl("/api/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
          return;
        }

        const data = await res.json();
        const nextUser = data?.user;
        const resolvedId = nextUser?.id ?? nextUser?._id;
        const resolvedEmail = nextUser?.email;

        if (!resolvedId || !resolvedEmail) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
          return;
        }

        setUser({
          id: String(resolvedId),
          name: String(nextUser.name ?? ""),
          email: String(resolvedEmail),
          role: nextUser?.role === "hospital" ? "hospital" : "user",
        });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  const isAuthenticated = Boolean(user?.id && user?.email);

  return { user, isLoading, isAuthenticated, logout };
};
