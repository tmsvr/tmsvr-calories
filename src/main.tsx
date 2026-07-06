import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { AppStateProvider } from "./state/appState";
import { LocalStorageStore } from "./storage/localStorageStore";
import "./styles.css";

// Single place where the storage backend is chosen. Swap this for a
// Supabase-backed DataStore later without touching the UI.
const store = new LocalStorageStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppStateProvider store={store}>
      <App />
    </AppStateProvider>
  </StrictMode>,
);
