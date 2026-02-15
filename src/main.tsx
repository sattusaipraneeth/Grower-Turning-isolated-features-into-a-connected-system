import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<div style='padding:2rem;font-family:system-ui'><h1>Error</h1><p>Root element #root not found.</p></div>";
} else {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("App render error:", err);
    rootEl.innerHTML = `<div style='padding:2rem;font-family:system-ui'><h1>Something went wrong</h1><pre style='white-space:pre-wrap'>${err instanceof Error ? err.message : String(err)}</pre></div>`;
  }
}
