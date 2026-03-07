// src/app/(public)/dashboard/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Settings2,
  Trash2,
  Moon,
  SunMedium,
  MailPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalProfileForm } from "@/components/settings/PersonalProfileForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";





type Role = "owner" | "admin" | "developer" | "viewer";
type MemberStatus = "active" | "invited";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
};

type Organization = {
  id: string;
  name: string;
  members: Member[];
  teamEnabled: boolean;
};

export default function SettingsPage() {
  // -----------------------------
  // HOOKS — MUST ALWAYS BE TOP
  // -----------------------------
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  // State
  const [fullName, setFullName] = useState("Max Mustermann");
  const [email, setEmail] = useState("you@example.com");
  const [country, setCountry] = useState("");

  const [activeTab, setActiveTab] = useState<
    "general" | "personal" | "organization" | "team"
  >("general");

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("developer");

  const [inviteName, setInviteName] = useState("");

  const teamEnabled = !!organization?.teamEnabled;
  const hasOrganization = !!organization;

// -----------------------------
// Hydration fix
// -----------------------------
useEffect(() => setMounted(true), []);

// -----------------------------
// LOAD ORGANIZATION FROM BACKEND
// -----------------------------
useEffect(() => {
  async function loadOrg() {
    const res = await fetch("/api/organizations/current");
    const data = await res.json();

    if (data.organization) {
      setOrganization({
        id: data.organization.id,
        name: data.organization.name,
        teamEnabled: data.organization.teamEnabled,
        members: data.organization.members || [],
      });
    }
  }

  loadOrg();
}, []);

  // -----------------------------
  // URL → TAB sync
  // -----------------------------
  useEffect(() => {
    const urlTab = searchParams.get("tab");

    if (
      urlTab &&
      ["general", "personal", "organization", "team"].includes(urlTab)
    ) {
      setActiveTab(urlTab as any);
    }
  }, [searchParams]);

  if (!mounted) return null;

  // -----------------------------
  // TAB CHANGE → URL sync
  // -----------------------------
  function handleTabChange(tab: string) {
    setActiveTab(tab as any);

    const newUrl = `/dashboard/settings?tab=${tab}`;
    router.replace(newUrl, { scroll: false });
  }

  // -----------------------------
  // Handlers
  // -----------------------------
  function handleDeleteAccount() {
    console.log("Delete personal account");
  }

  function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    console.log({ fullName, email, country });
  }

  function handleCreateOrganization() {
    const id = "org_" + crypto.randomUUID().slice(0, 8);

    setOrganization({
      id,
      name: `${fullName.split(" ")[0]} Org`,
      members: [
        {
          id: "owner",
          name: fullName,
          email,
          role: "owner",
          status: "active",
        },
      ],
      teamEnabled: false,
    });

    // Navigate to organization tab
    handleTabChange("organization");
  }

  function handleSaveOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;

    console.log("Save organization", {
        id: organization.id,
        name: organization.name,
    });
    }


  function handleEnableTeam() {
    if (!organization) return;

    setOrganization({ ...organization, teamEnabled: true });
    handleTabChange("team");
  }

  function handleDeleteOrganization() {
    setOrganization(null);
    handleTabChange("general");
  }

  function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || !inviteEmail) return;

    const name =
        inviteName.trim() ||
        inviteEmail.split("@")[0] ||
        "Pending user";

    setOrganization({
        ...organization,
        members: [
        ...organization.members,
        {
            id: crypto.randomUUID(),
            name,
            email: inviteEmail,
            role: inviteRole,
            status: "invited",
        },
        ],
    });

    setInviteName("");
    setInviteEmail("");
    setInviteRole("developer");
    }

  function handleRemoveMember(id: string) {
    if (!organization) return;

    setOrganization({
        ...organization,
        members: organization.members.filter((m) => m.id !== id),
    });
    }

  function handleChangeMemberRole(id: string, role: Role) {
    if (!organization) return;

    setOrganization({
      ...organization,
      members: organization.members.map((m) =>
        m.id === id ? { ...m, role } : m
      ),
    });
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-muted p-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal profile, organization and team.
          </p>
        </div>
      </div>

      {/* TABS */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          {organization && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Choose light or dark theme.</CardDescription>
            </CardHeader>

            <CardContent className="flex gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <SunMedium className="h-4 w-4" />
                Light
              </Button>

              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </CardContent>
          </Card>
        </TabsContent>


        {/* PERSONAL TAB */}
        <TabsContent value="personal">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal profile</CardTitle>
          </CardHeader>

          <CardContent>
            <PersonalProfileForm />
            <ChangePasswordForm />
          </CardContent>
        </Card>
        {/* Delete personal account */}
          <Card className="border-destructive/30 bg-destructive/5 mt-6">
            <CardHeader>
              <CardTitle className="text-destructive">Delete account</CardTitle>
              <CardDescription className="text-destructive text-xs">
                This cannot be undone.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <DeleteAccountButton />
            </CardContent>
          </Card>
      </TabsContent>




        {/* ORGANIZATION */}
        <TabsContent value="organization">
            <OrganizationSettings />
        </TabsContent>



        {/* TEAM */}
        <TabsContent value="team">
            <TeamSettings />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
