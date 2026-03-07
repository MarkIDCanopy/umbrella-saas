// src/app/(public)/layout.tsx
import { UserProvider } from "@/context/UserContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </UserProvider>
  );
}