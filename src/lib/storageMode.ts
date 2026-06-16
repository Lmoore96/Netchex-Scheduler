const databaseConnectedKey = "netchex-database-connected-v1";

export function readDatabaseConnected() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(databaseConnectedKey) !== "false";
}

export function writeDatabaseConnected(connected: boolean) {
  window.localStorage.setItem(databaseConnectedKey, String(connected));
}
