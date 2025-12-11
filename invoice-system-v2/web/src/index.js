import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const safeInitLocale = () => {
  try {
    const locale = navigator.language || "en-US";
    document.documentElement.setAttribute("lang", locale);
  } catch {
    document.documentElement.setAttribute("lang", "en");
  }
};

safeInitLocale();

try {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("App initialization failed", err);
}
