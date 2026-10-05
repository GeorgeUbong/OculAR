import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

import HomePage from "./frontend/home.jsx";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <HomePage />
    </React.StrictMode>
  );
}