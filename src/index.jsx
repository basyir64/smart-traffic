import { StrictMode, useEffect } from "react";
import "./index.css";
import "./i18n";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router";
import { AuthProvider } from "./auth-context";
import { PeriodProvider } from "./period-context";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./views/Layout";
import App from "./views/App";
import Login from "./views/Login";
import Siasatan from "./views/Siasatan";
import Penguatkuasaan from "./views/Penguatkuasaan";
import Lokasi from "./views/Lokasi";

function SpaRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [navigate]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <PeriodProvider>
        <BrowserRouter basename="/smart-traffic">
          <SpaRedirectHandler />
          <Routes>
            <Route element={<Layout />}>
              <Route path="" element={<App />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/siasatan"
                element={
                  <ProtectedRoute
                    allowedRoles={["Siasatan", "Penguatkuasaan", "Admin"]}
                  >
                    <Siasatan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/penguatkuasaan"
                element={
                  <ProtectedRoute
                    allowedRoles={["Siasatan", "Penguatkuasaan", "Admin"]}
                  >
                    <Penguatkuasaan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lokasi"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <Lokasi />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  </StrictMode>
);
