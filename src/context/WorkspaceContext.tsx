// src/context/WorkspaceContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type WorkspaceCtx = {
  activeOrgId: number | null;
  setActiveOrgId: (id: number | null) => void;
  workspaceVersion: number;
  bumpWorkspaceVersion: () => void;
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  const value = useMemo(
    () => ({
      activeOrgId,
      setActiveOrgId,
      workspaceVersion,
      bumpWorkspaceVersion: () => setWorkspaceVersion((v) => v + 1),
    }),
    [activeOrgId, workspaceVersion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}