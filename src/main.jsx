import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route} from "react-router-dom";
import "./style.css";

import HomePage from "./frontend/HomePage.jsx";
import Environment from "./frontend/MyEnvironments.jsx";
import { ThemeProvider } from "./components/ThemeContext.jsx";
import ViewerPage from "./frontend/MyProjects.jsx";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/environments" element={<Environment />} />
            <Route path="/projects" element={<ViewerPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}