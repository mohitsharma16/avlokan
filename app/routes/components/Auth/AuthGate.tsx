import { useAuth } from "../../contexts/AuthContext";
import AuthForm from "./AuthForm";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <AuthForm />;
  }

  return <>{children}</>;
}
