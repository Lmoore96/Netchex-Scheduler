import { useState } from "react";
import type { ParsedScheduleDraft } from "../domain/types";
import { uploadSchedulePdf } from "../lib/storageClient";

export function ImportPanel({ onDraft }: { onDraft: (draft: ParsedScheduleDraft) => void }) {
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setError("");
    setIsUploading(true);
    try {
      onDraft(await uploadSchedulePdf(file));
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
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      {isUploading ? <p role="status">Reading schedule...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
