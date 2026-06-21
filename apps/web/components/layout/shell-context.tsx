"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ResolvedPermission } from "@/lib/types/database";

type ShellExtrasState = {
  tablePermissions: ResolvedPermission[];
  connectionName?: string;
};

type ShellExtrasContextValue = ShellExtrasState & {
  registerExtras: (extras: ShellExtrasState) => void;
  clearExtras: () => void;
};

const EMPTY_EXTRAS: ShellExtrasState = { tablePermissions: [] };

const ShellExtrasContext = createContext<ShellExtrasContextValue>({
  ...EMPTY_EXTRAS,
  registerExtras: () => {},
  clearExtras: () => {},
});

export function ShellExtrasRoot({ children }: { children: React.ReactNode }) {
  const [extras, setExtras] = useState<ShellExtrasState>(EMPTY_EXTRAS);

  const value = useMemo<ShellExtrasContextValue>(
    () => ({
      ...extras,
      registerExtras: setExtras,
      clearExtras: () => setExtras(EMPTY_EXTRAS),
    }),
    [extras],
  );

  return (
    <ShellExtrasContext.Provider value={value}>
      {children}
    </ShellExtrasContext.Provider>
  );
}

/** Registers connection-scoped sidebar data from a nested server layout. */
export function ShellExtrasRegistrar({
  children,
  tablePermissions,
  connectionName,
}: {
  children: React.ReactNode;
  tablePermissions: ResolvedPermission[];
  connectionName?: string;
}) {
  const { registerExtras, clearExtras } = useContext(ShellExtrasContext);

  useEffect(() => {
    registerExtras({ tablePermissions, connectionName });
    return () => clearExtras();
  }, [tablePermissions, connectionName, registerExtras, clearExtras]);

  return children;
}

export function useShellExtras() {
  const { tablePermissions, connectionName } = useContext(ShellExtrasContext);
  return { tablePermissions, connectionName };
}
