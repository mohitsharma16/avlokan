import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import PocketBase, { type RecordModel } from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

interface IAuthContext {
  pb: PocketBase;
  user: RecordModel | null;
  token: string;
  isLoggedIn: boolean;
  logout: () => void;
  login: (token: string, record: RecordModel) => void;
}

const AuthContext = createContext<IAuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.model);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    }, true);

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => {
    pb.authStore.clear();
  };

  const login = (token: string, record: RecordModel) => {
    pb.authStore.save(token, record);
  };

  const value = useMemo(
    () => ({
      pb,
      user,
      token: pb.authStore.token,
      isLoggedIn: pb.authStore.isValid,
      logout,
      login,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
