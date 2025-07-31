import { useMatches, Navigate } from "react-router-dom";
import { useAuth } from "~/routes/contexts/AuthContext";
import AuthForm from "./AuthForm";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const matches = useMatches();

  const isPublicRoute = matches.some((match) => (match.handle as any)?.public);

  if (isPublicRoute) {
    return <>{children}</>;
  }
  if (!user) {
    return <AuthForm/>
  }
  return <>{children}</>;
}
