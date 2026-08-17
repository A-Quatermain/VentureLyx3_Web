import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import CommandCenter from "@/pages/CommandCenter";
import Operate from "@/pages/Operate";
import ScaleSEO from "@/pages/ScaleSEO";
import Reviews from "@/pages/Reviews";
import Settings from "@/pages/Settings";
import ComingSoon from "@/pages/ComingSoon";
import PaymentResult from "@/pages/PaymentResult";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<ProtectedRoute requireBusiness={false}><Onboarding /></ProtectedRoute>} />

            <Route path="/app/command" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
            <Route path="/app/operate" element={<ProtectedRoute><Operate /></ProtectedRoute>} />
            <Route path="/app/scaleseo" element={<ProtectedRoute><ScaleSEO /></ProtectedRoute>} />
            <Route path="/app/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/app/:module" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />

            <Route path="/payment/success" element={<PaymentResult />} />
            <Route path="/payment/cancel" element={<PaymentResult />} />
          </Routes>
          <Toaster theme="dark" position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
