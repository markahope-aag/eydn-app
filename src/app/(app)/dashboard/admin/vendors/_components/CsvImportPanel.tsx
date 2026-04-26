"use client";

import { useState } from "react";
import { toast } from "sonner";

type DryRunResult = {
  rowsParsed: number;
  rowsValid: number;
  rowsInvalid: number;
  wouldInsert: number;
  wouldUpdate: number;
  errors: string[];
  preview: Array<{ name: string; category: string; city: string; state: string }>;
  inserted?: number;
  skippedDuplicates?: number;
};

export function CsvImportPanel({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [committed, setCommitted] = useState(false);

  async function run(commit: boolean) {
    if (!file) {
      toast.error("Pick a CSV file first");
      return;
    }
    setBusy(true);
    setResult(null);
    setCommitted(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (commit) formData.append("commit", "true");
      const res = await fetch("/api/admin/suggested-vendors/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      setResult(data);
      setCommitted(commit);
      if (commit) {
        toast.success(`Imported ${data.inserted ?? 0} new vendors`);
        onImported();
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold text-plum">Import vendors from CSV</h3>
        <p className="text-[13px] text-muted mt-1">
          Required columns: <code>name, category, city, state</code>.
          Optional: <code>country, zip, website, phone, email, address, description, price_range, gmb_place_id</code>.
          Dedup: <code>gmb_place_id</code> first, otherwise (name, city, state).
          Existing rows are not overwritten.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setCommitted(false); }}
          className="text-[14px]"
        />
        <button onClick={() => run(false)} disabled={!file || busy} className="btn-secondary btn-sm">
          {busy && !committed ? "Checking…" : "Dry run"}
        </button>
        <button
          onClick={() => run(true)}
          disabled={!file || busy || !result || (result.rowsInvalid ?? 0) > 0}
          className="btn-primary btn-sm"
          title={result && result.rowsInvalid > 0 ? "Fix invalid rows first" : ""}
        >
          {busy && committed ? "Importing…" : "Commit import"}
        </button>
      </div>

      {result && (
        <div className="rounded-[10px] bg-whisper p-4 text-[13px] space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Parsed" value={result.rowsParsed} />
            <Stat label="Valid" value={result.rowsValid} />
            <Stat label={committed ? "Inserted" : "Would insert"} value={committed ? (result.inserted ?? 0) : result.wouldInsert} />
            <Stat label={committed ? "Skipped (dupes)" : "Would update"} value={committed ? (result.skippedDuplicates ?? 0) : result.wouldUpdate} />
          </div>
          {result.rowsInvalid > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-declined-text font-medium">
                {result.rowsInvalid} invalid row{result.rowsInvalid === 1 ? "" : "s"} — view errors
              </summary>
              <ul className="mt-2 ml-5 list-disc text-declined-text">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          {result.preview.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted">Preview first {result.preview.length}</summary>
              <ul className="mt-2 ml-5 list-disc text-muted">
                {result.preview.map((p, i) => (
                  <li key={i}>{p.name} — {p.category} ({p.city}, {p.state})</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted text-[12px]">{label}</p>
      <p className="text-plum text-[18px] font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
