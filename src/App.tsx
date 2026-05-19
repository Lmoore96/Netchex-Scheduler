import { useState } from "react";
import { ImportPanel } from "./components/ImportPanel";
import { ReviewImport } from "./components/ReviewImport";
import { Shell } from "./components/Shell";
import type { ParsedScheduleDraft } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

export function App() {
  const [draft, setDraft] = useState<ParsedScheduleDraft | null>(null);
  const [message, setMessage] = useState("");

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    const result = await confirmReviewedImport(reviewed);
    setMessage(`Import confirmed: ${result.importId}`);
    setDraft(null);
  }

  return (
    <Shell>
      {draft ? (
        <ReviewImport
          draft={draft}
          onBack={() => setDraft(null)}
          onConfirm={(reviewed) => void confirmImport(reviewed)}
        />
      ) : (
        <ImportPanel onDraft={setDraft} />
      )}
      {message ? <p role="status">{message}</p> : null}
    </Shell>
  );
}
