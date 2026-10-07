import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route} from "react-router-dom";
import "./style.css";

import HomePage from "./pages/HomePage.jsx";
import { ThemeProvider } from "./components/ThemeContext.jsx";
import StorageNotice from "./components/StorageNotice.jsx";
import LoadingPage from "./components/Loading.jsx";
import { DesktopOnly } from "./components/ScreenSize.jsx";

const Environment = lazy(() => import("./pages/MyEnvironments.jsx"));
const MyProjects = lazy(() => import("./pages/MyProjects.jsx"));
const AssetView = lazy(() => import("./pages/AssetView.jsx"));

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <StorageNotice />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/environments"
              element={
                <Suspense fallback={<div role="status" className="p-6 text-center font-gsans text-copy">Loading environments...</div>}>
                  <Environment />
                </Suspense>
              }
            />
            <Route
              path="/projects"
              element={
                <Suspense fallback={<div role="status" className="p-6 text-center font-gsans text-copy">Loading projects...</div>}>
                  <MyProjects />
                </Suspense>
              }
            />
            <Route
              path="/projects/:assetId"
              element={
                <Suspense fallback={<LoadingPage message="Loading 3D view..." />}>
                  <DesktopOnly>
                    <AssetView />
                  </DesktopOnly>
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}
