// src/lib/orgTypes.ts
export type OrgRole = "owner" | "admin" | "user" | "viewer";
export type MemberStatus = "active" | "invited";

export type OrgMember = {
  id: number;
  name: string | null;
  email: string;
  role: OrgRole;
  status: MemberStatus;
};

export type OrganizationDTO = {
  id: number;
  name: string;
  members: OrgMember[];
};
