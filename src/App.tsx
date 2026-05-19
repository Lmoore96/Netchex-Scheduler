import { useState } from "react";
import { ImportPanel } from "./components/ImportPanel";
import { ReviewImport } from "./components/ReviewImport";
import { Shell } from "./components/Shell";
import type { ParsedScheduleDraft } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

export function App() {
  const [draft, setDraft] = useState<ParsedScheduleDraft | null>(null);
  const [message, setMessage] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    setConfirmError("");
    setIsConfirming(true);
    try {
      const result = await confirmReviewedImport(reviewed);
      setMessage(`Import confirmed: ${result.importId}`);
      setDraft(null);
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : "Import could not be confirmed");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Shell>
      {draft ? (
        <ReviewImport
          draft={draft}
          onBack={() => {
            setConfirmError("");
            setDraft(null);
          }}
          onConfirm={(reviewed) => void confirmImport(reviewed)}
          isConfirming={isConfirming}
          confirmError={confirmError}
        />
      ) : (
        <ImportPanel
          onDraft={(nextDraft) => {
            setMessage("");
            setConfirmError("");
            setDraft(nextDraft);
          }}
        />
      )}
      {message ? <p role="status">{message}</p> : null}
    </Shell>
  );
}
