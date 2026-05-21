import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { FitToViewport } from "./ui/FitToViewport.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <React.StrictMode>
    <FitToViewport>
      <App />
    </FitToViewport>
  </React.StrictMode>,
);
