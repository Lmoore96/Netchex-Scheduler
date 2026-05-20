import { useState } from "react";
import type { ParsedScheduleDraft } from "../domain/types";
import { uploadSchedulePdf } from "../lib/storageClient";

interface ImportPanelProps {
  onDraft: (draft: ParsedScheduleDraft) => void | Promise<void>;
  isImporting?: boolean;
  externalError?: string;
}

export function ImportPanel({ onDraft, isImporting = false, externalError = "" }: ImportPanelProps) {
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const isBusy = isUploading || isImporting;

  async function handleFile(file: File) {
    setError("");
    setIsUploading(true);
    try {
      await onDraft(await uploadSchedulePdf(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Import Netchex PDF</h2>
      <label className="upload">
        <span>Choose PDF</span>
        <input
          type="file"
          accept="application/pdf"
          disabled={isBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      {isBusy ? <p role="status">Reading and importing schedule...</p> : null}
      {error || externalError ? <p role="alert">{error || externalError}</p> : null}
    </section>
  );
}
