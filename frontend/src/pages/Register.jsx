import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created");
      navigate("/onboarding");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] vx-grid-bg px-4">
      <div className="w-full max-w-md vx-fade-up">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-heading font-extrabold">V</div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-white">Venturelyx</span>
        </Link>
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-8">
          <h1 className="font-heading font-bold text-2xl tracking-tight text-white">Start building</h1>
          <p className="text-sm text-[#737373] mt-1">Create your account in seconds.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Your name</Label>
              <Input data-testid="register-name" value={name} onChange={(e) => setName(e.target.value)} required
                className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
            </div>
            <div>
              <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Email</Label>
              <Input data-testid="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
            </div>
            <div>
              <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Password</Label>
              <Input data-testid="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
            </div>
            {error && <p data-testid="register-error" className="text-sm text-red-400">{error}</p>}
            <Button data-testid="register-submit" type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-center text-[#737373]">
            Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
