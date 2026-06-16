import { useState } from "react";

interface AdminMenuProps {
  databaseConnected: boolean;
  onDatabaseConnectedChange: (connected: boolean) => void;
}

export function AdminMenu({ databaseConnected, onDatabaseConnectedChange }: AdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="admin-menu">
      <button type="button" className="admin-menu__trigger" onClick={() => setIsOpen((current) => !current)}>
        Admin
      </button>
      {isOpen ? (
        <div className="admin-menu__panel" role="dialog" aria-label="Admin settings">
          <div>
            <h2>Admin</h2>
            <p>{databaseConnected ? "Database mode is active." : "Local mode: data stays on this device"}</p>
          </div>
          <div className="admin-menu__setting">
            <div>
              <strong>Database connected</strong>
              <span>{databaseConnected ? "Uses Supabase storage" : "Uses this browser only"}</span>
            </div>
            <button
              type="button"
              className="admin-menu__switch"
              role="switch"
              aria-checked={databaseConnected}
              aria-label="Database connected"
              onClick={() => onDatabaseConnectedChange(!databaseConnected)}
            >
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
