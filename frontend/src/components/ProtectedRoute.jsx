import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="font-mono text-sm text-[#737373] flex items-center gap-2">
        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        loading venturelyx<span className="vx-cursor" />
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requireBusiness = true }) {
  const { user, business, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireBusiness && !business) return <Navigate to="/onboarding" replace />;
  return children;
}
