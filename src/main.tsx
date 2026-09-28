import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui/Feedback";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* reducedMotion="user": Framer Motion follows the device's reduced-motion setting */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
