import { StrictMode } from "react";
import "./index.css";
import "./i18n";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { PeriodProvider } from "./period-context";
import Layout from "./views/Layout";
import App from "./views/App";
import Siasatan from "./views/Siasatan";
import Analysis from "./views/Analysis";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PeriodProvider>
      <BrowserRouter basename="/smarttraffic">
        <Routes>
          <Route element={<Layout />}>
            <Route path="" element={<App />} />
            <Route path="/siasatan" element={<Siasatan />} />
            <Route path="/analysis" element={<Analysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PeriodProvider>
  </StrictMode>
);
