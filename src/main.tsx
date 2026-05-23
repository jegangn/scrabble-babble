import React from "react";
import { createRoot } from "react-dom/client";
import { DeviceRouter } from "./ui/DeviceRouter.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <React.StrictMode>
    <DeviceRouter />
  </React.StrictMode>,
);
