"use client";

import type { Connection, Profile, Role } from "@supa-admin/projections";
import { aggregateRolePermissions } from "@supa-admin/projections";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type OverrideField = "can_read" | "can_create" | "can_update" | "can_delete";

type OverrideCell = Record<OverrideField, boolean | null>;

const PERM_FIELDS: OverrideField[] = [
  "can_read",
  "can_create",
  "can_update",
  "can_delete",
];

function cycleOverrideValue(current: boolean | null): boolean | null {
  if (current === null) return true;
  if (current === true) return false;
  return null;
}

function overrideCellLabel(
  value: boolean | null,
  inherited: boolean,
  tInherit: string,
): string {
  if (value === null) return `${tInherit} (${inherited ? "✓" : "—"})`;
  return value ? "✓" : "✗";
}

export function UsersManager() {
  const t = useTranslations("users");
  const tRoles = useTranslations("roles");
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
  const [overrideConnectionId, setOverrideConnectionId] = useState("");
  const [overrideTables, setOverrideTables] = useState<string[]>([]);
  const [roleBaseline, setRoleBaseline] = useState<
    Record<string, Record<OverrideField, boolean>>
  >({});
  const [overrides, setOverrides] = useState<Record<string, OverrideCell>>({});

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
  const overrideConnectionItems = useMemo(
    () =>
      Object.fromEntries(
        connections
          .filter((c) => editConnectionIds.includes(c.id))
          .map((c) => [c.id, c.name]),
      ),
    [connections, editConnectionIds],
  );

  useEffect(() => {
    void loadUsers();
    orpcBrowser.roles.list().then((d) => setRoles(d.roles ?? []));
    orpcBrowser.connections
      .list()
      .then((d) => setConnections(d.connections ?? []));
  }, []);

  useEffect(() => {
    if (!editUser || !overrideConnectionId) {
      setOverrideTables([]);
      setRoleBaseline({});
      setOverrides({});
      return;
    }

    let cancelled = false;

    async function loadOverrideMatrix() {
      const user = editUser;
      if (!user) return;
      try {
        const [connData, accessData] = await Promise.all([
          orpcBrowser.connections.get({ id: overrideConnectionId }),
          orpcBrowser.access.getUserOverrides({
            userId: user.id,
            connectionId: overrideConnectionId,
          }),
        ]);
        if (cancelled) return;

        const tableNames = (connData.tables ?? []).map((tbl) => tbl.table_name);
        setOverrideTables(tableNames);

        const baseline = aggregateRolePermissions(accessData.rolePermissions);
        const baselineRecord: typeof roleBaseline = {};
        for (const tableName of tableNames) {
          const perm = baseline.get(tableName);
          baselineRecord[tableName] = {
            can_read: perm?.can_read ?? false,
            can_create: perm?.can_create ?? false,
            can_update: perm?.can_update ?? false,
            can_delete: perm?.can_delete ?? false,
          };
        }
        setRoleBaseline(baselineRecord);

        const overrideMap: Record<string, OverrideCell> = {};
        for (const tableName of tableNames) {
          overrideMap[tableName] = {
            can_read: null,
            can_create: null,
            can_update: null,
            can_delete: null,
          };
        }
        for (const row of accessData.overrides ?? []) {
          if (!overrideMap[row.table_name]) continue;
          overrideMap[row.table_name] = {
            can_read: row.can_read,
            can_create: row.can_create,
            can_update: row.can_update,
            can_delete: row.can_delete,
          };
        }
        setOverrides(overrideMap);
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    }

    void loadOverrideMatrix();
    return () => {
      cancelled = true;
    };
  }, [editUser, overrideConnectionId, tCommon]);

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
    setOverrideConnectionId("");
    const detail = await orpcBrowser.users.get({ id: user.id });
    const userRoles = (detail.userRoles ?? []) as Array<{ role_id: string }>;
    const memberships = (detail.memberships ?? []) as Array<{
      connection_id: string;
    }>;
    const connectionIds = memberships.map((m) => m.connection_id);
    setEditRoleIds(userRoles.map((r) => r.role_id));
    setEditConnectionIds(connectionIds);
    setProvisionConnectionId(connectionIds[0] ?? "");
  }

  async function saveEdit() {
    if (!editUser || editUser.role === "platform_admin") return;
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

  async function saveOverrides() {
    if (!editUser || !overrideConnectionId) return;
    try {
      const payload = Object.entries(overrides)
        .filter(([, cells]) =>
          PERM_FIELDS.some((field) => cells[field] !== null),
        )
        .map(([table_name, cells]) => ({
          table_name,
          ...cells,
        }));

      await orpcBrowser.access.updateUserOverrides({
        userId: editUser.id,
        connectionId: overrideConnectionId,
        overrides: payload,
      });
      toast.success(tCommon("success"));
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

  function toggleOverride(tableName: string, field: OverrideField) {
    setOverrides((prev) => {
      const current = prev[tableName] ?? {
        can_read: null,
        can_create: null,
        can_update: null,
        can_delete: null,
      };
      return {
        ...prev,
        [tableName]: {
          ...current,
          [field]: cycleOverrideValue(current[field]),
        },
      };
    });
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editUser?.display_name ?? editUser?.email}
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-6">
              {editUser.role === "platform_admin" ? (
                <Alert className="border-warning/40 bg-warning/10 text-warning-foreground">
                  <TriangleAlert />
                  <AlertDescription className="text-warning-foreground">
                    {t("adminRbacHint")}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
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
                            editConnectionIds.includes(c.id)
                              ? "default"
                              : "outline"
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
                    <Label>{t("overrides")}</Label>
                    <Select
                      items={overrideConnectionItems}
                      value={overrideConnectionId}
                      onValueChange={(v) => setOverrideConnectionId(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectConnection")} />
                      </SelectTrigger>
                      <SelectContent>
                        {connections
                          .filter((c) => editConnectionIds.includes(c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {overrideConnectionId && overrideTables.length > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t("overrideHint")}
                        </p>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>{tRoles("tableName")}</TableHead>
                                {PERM_FIELDS.map((field) => (
                                  <TableHead key={field}>
                                    {tRoles(
                                      field === "can_read"
                                        ? "canRead"
                                        : field === "can_create"
                                          ? "canCreate"
                                          : field === "can_update"
                                            ? "canUpdate"
                                            : "canDelete",
                                    )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {overrideTables.map((tableName) => (
                                <TableRow key={tableName}>
                                  <TableCell>{tableName}</TableCell>
                                  {PERM_FIELDS.map((field) => {
                                    const value =
                                      overrides[tableName]?.[field] ?? null;
                                    const inherited =
                                      roleBaseline[tableName]?.[field] ?? false;
                                    return (
                                      <TableCell key={field} className="p-1">
                                        <Button
                                          size="sm"
                                          className="h-8 min-w-[4.5rem] px-2 text-xs whitespace-nowrap"
                                          variant={
                                            value === null
                                              ? "outline"
                                              : "secondary"
                                          }
                                          onClick={() =>
                                            toggleOverride(tableName, field)
                                          }
                                        >
                                          {overrideCellLabel(
                                            value,
                                            inherited,
                                            t("inherit"),
                                          )}
                                        </Button>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <Button onClick={saveOverrides}>
                          {tCommon("save")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </>
              )}

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
