"use client";

import type { Connection, Role } from "@supa-admin/projections";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type ConnectionTable = {
  table_name: string;
};

export function RolesManager() {
  const t = useTranslations("roles");
  const tRolesPage = useTranslations("rolesPage");
  const tCommon = useTranslations("common");
  const [roles, setRoles] = useState<
    Array<Pick<Role, "id" | "name"> & Partial<Role>>
  >([]);
  const [connections, setConnections] = useState<
    Pick<Connection, "id" | "name">[]
  >([]);
  const [tables, setTables] = useState<ConnectionTable[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState("");
  const [permissions, setPermissions] = useState<
    Record<
      string,
      {
        can_read: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
      }
    >
  >({});

  const roleItems = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.id, r.name])),
    [roles],
  );
  const connectionItems = useMemo(
    () => Object.fromEntries(connections.map((c) => [c.id, c.name])),
    [connections],
  );

  useEffect(() => {
    orpcBrowser.roles.list().then((d) => setRoles(d.roles ?? []));
    orpcBrowser.connections
      .list()
      .then((d) => setConnections(d.connections ?? []));
  }, []);

  useEffect(() => {
    if (!selectedConnection) {
      setTables([]);
      setPermissions({});
      return;
    }

    let cancelled = false;

    async function loadPermissionsMatrix() {
      try {
        const connData = await orpcBrowser.connections.get({
          id: selectedConnection,
        });
        if (cancelled) return;

        const tableList = connData.tables ?? [];
        setTables(tableList);

        const perms: typeof permissions = {};
        for (const tbl of tableList) {
          perms[tbl.table_name] = {
            can_read: false,
            can_create: false,
            can_update: false,
            can_delete: false,
          };
        }

        if (selectedRole) {
          const roleData = await orpcBrowser.roles.getPermissions({
            roleId: selectedRole,
            connectionId: selectedConnection,
          });
          if (cancelled) return;

          for (const perm of roleData.permissions ?? []) {
            perms[perm.table_name] = {
              can_read: perm.can_read,
              can_create: perm.can_create,
              can_update: perm.can_update,
              can_delete: perm.can_delete,
            };
          }
        }

        setPermissions(perms);
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    }

    void loadPermissionsMatrix();
    return () => {
      cancelled = true;
    };
  }, [selectedConnection, selectedRole]);

  async function createRole() {
    try {
      const data = await orpcBrowser.roles.create({ name: newRoleName });
      setRoles((prev) => [...prev, data.role]);
      setNewRoleName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  async function savePermissions() {
    try {
      const data = await orpcBrowser.roles.updatePermissions({
        roleId: selectedRole,
        connectionId: selectedConnection,
        permissions: Object.entries(permissions).map(([table_name, p]) => ({
          table_name,
          ...p,
        })),
      });
      if (data.rlsSync.success) {
        toast.success(tCommon("success"));
      } else {
        toast.warning(
          tRolesPage("rlsSyncFailed", {
            error: data.rlsSync.error ?? tCommon("error"),
          }),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
  }

  function togglePerm(
    table: string,
    field: "can_read" | "can_create" | "can_update" | "can_delete",
  ) {
    setPermissions((prev) => {
      const current = prev[table] ?? {
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      };
      return {
        ...prev,
        [table]: { ...current, [field]: !current[field] },
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-md">
        <Input
          placeholder={t("name")}
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
        />
        <Button onClick={createRole}>{t("add")}</Button>
      </div>

      <div className="flex gap-4">
        <div className="space-y-2">
          <Label>{t("name")}</Label>
          <Select
            items={roleItems}
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v ?? "")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("name")} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("connection")}</Label>
          <Select
            items={connectionItems}
            value={selectedConnection}
            onValueChange={(v) => setSelectedConnection(v ?? "")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("connection")} />
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRole && selectedConnection && tables.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>{t("tableName")}</TableHead>
                <TableHead>{t("canRead")}</TableHead>
                <TableHead>{t("canCreate")}</TableHead>
                <TableHead>{t("canUpdate")}</TableHead>
                <TableHead>{t("canDelete")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((tbl, index) => (
                <TableRow
                  key={tbl.table_name}
                  className={index % 2 === 1 ? "bg-muted/10" : undefined}
                >
                  <TableCell>{tbl.table_name}</TableCell>
                  {(
                    [
                      "can_read",
                      "can_create",
                      "can_update",
                      "can_delete",
                    ] as const
                  ).map((field) => (
                    <TableCell key={field}>
                      <Checkbox
                        checked={permissions[tbl.table_name]?.[field] ?? false}
                        onCheckedChange={() =>
                          togglePerm(tbl.table_name, field)
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={savePermissions}>{tCommon("save")}</Button>
        </>
      )}
    </div>
  );
}
