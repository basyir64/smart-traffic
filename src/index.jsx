import { StrictMode } from "react";
import "./index.css";
import "./i18n";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { AuthProvider } from "./auth-context";
import { PeriodProvider } from "./period-context";
import { UnsavedChangesProvider } from "./unsaved-changes-context";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./views/Layout";
import App from "./views/App";
import Login from "./views/Login";
import Siasatan from "./views/Siasatan";
import Penguatkuasaan from "./views/Penguatkuasaan";
import Lokasi from "./views/Lokasi";

const router = createBrowserRouter(
  [
    {
      element: (
        <UnsavedChangesProvider>
          <Layout />
        </UnsavedChangesProvider>
      ),
      children: [
        { index: true, element: <App /> },
        { path: "login", element: <Login /> },
        {
          path: "siasatan",
          element: (
            <ProtectedRoute
              allowedRoles={["Siasatan", "Penguatkuasaan", "Admin"]}
            >
              <Siasatan />
            </ProtectedRoute>
          ),
        },
        {
          path: "penguatkuasaan",
          element: (
            <ProtectedRoute
              allowedRoles={["Siasatan", "Penguatkuasaan", "Admin"]}
            >
              <Penguatkuasaan />
            </ProtectedRoute>
          ),
        },
        {
          path: "lokasi",
          element: (
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Lokasi />
            </ProtectedRoute>
          ),
        },
      ],
    },
  ],
  { basename: "/smart-traffic" }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <PeriodProvider>
        <RouterProvider router={router} />
      </PeriodProvider>
    </AuthProvider>
  </StrictMode>
);
