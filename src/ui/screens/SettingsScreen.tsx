import { useRef, useState } from "react";
import { useAppState } from "../appState";
import type { ExportedData } from "../../core/store";
import type { Targets } from "../../core/types";

function num(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function SettingsScreen() {
  const { targets, saveTargets, exportAll, importAll } = useAppState();
  const [draft, setDraft] = useState({
    kcal: String(targets.kcal),
    protein: String(targets.protein),
    carbs: String(targets.carbs),
    fat: String(targets.fat),
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const t: Targets = {
      kcal: num(draft.kcal),
      protein: num(draft.protein),
      carbs: num(draft.carbs),
      fat: num(draft.fat),
    };
    await saveTargets(t);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calories-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportedData;
      if (!data.schemaVersion || !Array.isArray(data.foods)) {
        throw new Error("Not a valid backup file");
      }
      if (
        !confirm(
          "Importing replaces ALL current data (targets, foods, history). Continue?",
        )
      ) {
        return;
      }
      await importAll(data);
      alert("Import complete.");
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : err}`);
    }
  };

  const fields = [
    { key: "kcal" as const, label: "Calories (kcal)" },
    { key: "protein" as const, label: "Protein (g)" },
    { key: "carbs" as const, label: "Carbs (g)" },
    { key: "fat" as const, label: "Fat (g)" },
  ];

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>

      <section className="card">
        <h2 className="section-title">Daily targets</h2>
        {fields.map((f) => (
          <label key={f.key} className="field field-inline">
            <span>{f.label}</span>
            <input
              inputMode="decimal"
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <button className="btn-primary" onClick={save}>
          {savedFlash ? "Saved ✓" : "Save targets"}
        </button>
      </section>

      <section className="card">
        <h2 className="section-title">Backup</h2>
        <p className="hint">
          Data lives only in this browser. Export a JSON backup now and then —
          it also moves your data to a new phone.
        </p>
        <div className="btn-row">
          <button className="btn-ghost" onClick={doExport}>
            Export JSON
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) doImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}
