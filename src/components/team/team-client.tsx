"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Crown,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserPlus,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteUser,
  changeUserRole,
  removeUser,
  reactivateUser,
} from "@/server/actions/team";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: "ADMIN" | "CONTENT_CREATOR" | "COMMUNITY_MANAGER" | "AMBASSADOR";
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export function TeamClient({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [pending, startTransition] = useTransition();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    startTransition(async () => {
      const r = await inviteUser({ email, fullName: fullName || undefined, role });
      if (r.ok) {
        toast.success(r.message ?? "Invited.");
        setEmail("");
        setFullName("");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-ember-300" /> Invite Brother
          </CardTitle>
          <CardDescription>
            They'll be able to sign in via magic link once invited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brother@heavensleaf.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First Last"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team ({members.length})</CardTitle>
          <CardDescription>
            Members with sign-in access to EmberOS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No team members yet. Invite the first one on the left.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isSelf={m.id === currentUserId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
}: {
  member: TeamMember;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayRole = member.role === "ADMIN" ? "Admin" : "Member";

  function handleRoleChange(role: "ADMIN" | "MEMBER") {
    setMenuOpen(false);
    startTransition(async () => {
      const r = await changeUserRole(member.id, role);
      if (r.ok) toast.success(`Role updated to ${role.toLowerCase()}.`);
      else toast.error(r.error);
    });
  }

  function handleRemove() {
    setMenuOpen(false);
    if (!confirm(`Remove ${member.email} from the team?`)) return;
    startTransition(async () => {
      const r = await removeUser(member.id);
      if (r.ok) toast.success("Removed.");
      else toast.error(r.error);
    });
  }

  function handleReactivate() {
    setMenuOpen(false);
    startTransition(async () => {
      const r = await reactivateUser(member.id);
      if (r.ok) toast.success("Reactivated.");
      else toast.error(r.error);
    });
  }

  return (
    <motion.div
      layout
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-ember-400 to-tobacco-600 text-ink-950 flex items-center justify-center text-xs font-semibold">
        {(member.fullName ?? member.email)[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ivory truncate">
            {member.fullName ?? member.email}
          </span>
          {isSelf && (
            <Badge variant="outline" className="text-[10px]">
              you
            </Badge>
          )}
          {!member.isActive && (
            <Badge variant="destructive" className="text-[10px]">
              inactive
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {member.email}
          {member.lastSeenAt && (
            <>
              {" · "}
              <span>
                last seen{" "}
                {new Date(member.lastSeenAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      </div>

      <Badge variant={member.role === "ADMIN" ? "gold" : "outline"}>
        {member.role === "ADMIN" && <Crown className="h-3 w-3 mr-1" />}
        {displayRole}
      </Badge>

      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-9 z-20 w-44 rounded-md border border-white/10 bg-ink-850 shadow-cinematic py-1">
              {member.role !== "ADMIN" && (
                <MenuItem
                  icon={Crown}
                  label="Promote to Admin"
                  onClick={() => handleRoleChange("ADMIN")}
                />
              )}
              {member.role === "ADMIN" && !isSelf && (
                <MenuItem
                  icon={Crown}
                  label="Demote to Member"
                  onClick={() => handleRoleChange("MEMBER")}
                />
              )}
              {member.isActive ? (
                !isSelf && (
                  <MenuItem
                    icon={Trash2}
                    label="Remove"
                    destructive
                    onClick={handleRemove}
                  />
                )
              ) : (
                <MenuItem
                  icon={RotateCcw}
                  label="Reactivate"
                  onClick={handleReactivate}
                />
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/[0.04] ${
        destructive ? "text-red-300" : "text-ivory"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
