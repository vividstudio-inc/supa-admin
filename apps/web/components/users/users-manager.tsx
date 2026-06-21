"use client";

import type { Connection, Profile, Role } from "@supa-admin/projections";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpcBrowser } from "@/lib/orpc/client.browser";

type UserRow = Pick<
  Profile,
  "id" | "email" | "display_name" | "role" | "created_at"
>;

export function UsersManager() {
  const t = useTranslations("users");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Pick<Role, "id" | "name">[]>([]);
  const [connections, setConnections] = useState<
    Pick<Connection, "id" | "name">[]
  >([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"platform_admin" | "member">("member");
  const [open, setOpen] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editConnectionIds, setEditConnectionIds] = useState<string[]>([]);
  const [provisionConnectionId, setProvisionConnectionId] = useState("");
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");

  const platformRoleItems = useMemo(
    () => ({
      platform_admin: t("platformAdmin"),
      member: t("member"),
    }),
    [t],
  );
  const connectionItems = useMemo(
    () => Object.fromEntries(connections.map((c) => [c.id, c.name])),
    [connections],
  );

  useEffect(() => {
    void loadUsers();
    orpcBrowser.roles.list().then((d) => setRoles(d.roles ?? []));
    orpcBrowser.connections
      .list()
      .then((d) => setConnections(d.connections ?? []));
  }, []);

  async function loadUsers() {
    const data = await orpcBrowser.users.list();
    setUsers(data.users ?? []);
  }

  async function createUser() {
    try {
      await orpcBrowser.users.create({ email, password, displayName, role });
      toast.success(tCommon("success"));
      setOpen(false);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  async function openEdit(user: UserRow) {
    setEditUser(user);
    setProvisionEmail(user.email);
    const detail = await orpcBrowser.users.get({ id: user.id });
    const userRoles = (detail.userRoles ?? []) as Array<{ role_id: string }>;
    const memberships = (detail.memberships ?? []) as Array<{
      connection_id: string;
    }>;
    setEditRoleIds(userRoles.map((r) => r.role_id));
    setEditConnectionIds(memberships.map((m) => m.connection_id));
    setProvisionConnectionId(memberships[0]?.connection_id ?? "");
  }

  async function saveEdit() {
    if (!editUser) return;
    try {
      await orpcBrowser.users.update({
        id: editUser.id,
        roleIds: editRoleIds,
        connectionIds: editConnectionIds,
      });
      toast.success(tCommon("success"));
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  async function provisionTargetUser() {
    if (!editUser || !provisionConnectionId) return;
    try {
      await orpcBrowser.provision.createUser({
        connectionId: provisionConnectionId,
        userId: editUser.id,
        email: provisionEmail,
        password: provisionPassword,
      });
      toast.success(tCommon("success"));
      setProvisionPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>{t("add")}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("displayName")}</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAuth("email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAuth("password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <Select
                items={platformRoleItems}
                value={role}
                onValueChange={(v) =>
                  setRole((v ?? "member") as "platform_admin" | "member")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">
                    {t("platformAdmin")}
                  </SelectItem>
                  <SelectItem value="member">{t("member")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createUser}>{tCommon("create")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editUser != null}
        onOpenChange={(next) => !next && setEditUser(null)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editUser?.display_name ?? editUser?.email}
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{t("assignRoles")}</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <Button
                      key={r.id}
                      size="sm"
                      variant={
                        editRoleIds.includes(r.id) ? "default" : "outline"
                      }
                      onClick={() =>
                        setEditRoleIds((prev) => toggleId(prev, r.id))
                      }
                    >
                      {r.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("memberships")}</Label>
                <div className="flex flex-wrap gap-2">
                  {connections.map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={
                        editConnectionIds.includes(c.id) ? "default" : "outline"
                      }
                      onClick={() =>
                        setEditConnectionIds((prev) => toggleId(prev, c.id))
                      }
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={saveEdit}>{tCommon("save")}</Button>

              <div className="space-y-3 border-t pt-4">
                <Label>{t("provision")}</Label>
                <Select
                  items={connectionItems}
                  value={provisionConnectionId}
                  onValueChange={(v) => setProvisionConnectionId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectConnection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="email"
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  placeholder={tAuth("email")}
                />
                <Input
                  type="password"
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  placeholder={tAuth("password")}
                  minLength={8}
                />
                <Button
                  variant="secondary"
                  onClick={provisionTargetUser}
                  disabled={
                    !provisionConnectionId || provisionPassword.length < 8
                  }
                >
                  {t("provision")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("displayName")}</TableHead>
            <TableHead>{tAuth("email")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.display_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.role === "platform_admin"
                  ? t("platformAdmin")
                  : t("member")}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(user)}
                >
                  {tCommon("edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
