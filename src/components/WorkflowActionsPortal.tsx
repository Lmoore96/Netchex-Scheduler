import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface WorkflowActionsPortalProps {
  children: ReactNode;
}

export function WorkflowActionsPortal({ children }: WorkflowActionsPortalProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("workflow-actions-root"));
  }, []);

  if (!target) return null;

  return createPortal(children, target);
}
