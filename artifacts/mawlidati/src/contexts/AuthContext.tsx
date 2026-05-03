import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, User, UserRole } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isWorker: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isOwner: false,
  isAdmin: false,
  isWorker: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      staleTime: Infinity,
    }
  });

  useEffect(() => {
    if (isError && location !== "/login") {
      setLocation("/login");
    }
  }, [isError, location, setLocation]);

  if (isLoading && location !== "/login") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const isOwner = user?.role === UserRole.owner;
  const isAdmin = user?.role === UserRole.admin || isOwner;
  const isWorker = user?.role === UserRole.worker;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isOwner,
        isAdmin,
        isWorker,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}