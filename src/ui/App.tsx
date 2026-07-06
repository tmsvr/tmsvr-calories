import { useState } from "react";
import { useAppState } from "../state/appState";
import { TodayScreen } from "./screens/TodayScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { FoodsScreen } from "./screens/FoodsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type Tab = "today" | "history" | "foods" | "settings";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "today", label: "Today", icon: "◎" },
  { id: "history", label: "History", icon: "📅" },
  { id: "foods", label: "Foods", icon: "🍽" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function App() {
  const { ready, setDateKey } = useAppState();
  const [tab, setTab] = useState<Tab>("today");

  if (!ready) return null;

  return (
    <div className="app">
      <main className="content">
        {tab === "today" && <TodayScreen />}
        {tab === "history" && (
          <HistoryScreen
            onOpenDay={(dateKey) => {
              setDateKey(dateKey);
              setTab("today");
            }}
          />
        )}
        {tab === "foods" && <FoodsScreen />}
        {tab === "settings" && <SettingsScreen />}
      </main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
