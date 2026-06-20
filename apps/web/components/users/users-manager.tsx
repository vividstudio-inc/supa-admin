"use client";

import type { Profile } from "@supa-admin/projections";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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

export function UsersManager() {
  const t = useTranslations("users");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [users, setUsers] = useState<
    Array<
      Pick<Profile, "id" | "email" | "display_name" | "role" | "created_at">
    >
  >([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"platform_admin" | "member">("member");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    orpcBrowser.users.list().then((d) => setUsers(d.users ?? []));
  }, []);

  async function createUser() {
    try {
      await orpcBrowser.users.create({ email, password, displayName, role });
      toast.success(tCommon("success"));
      setOpen(false);
      const refreshed = await orpcBrowser.users.list();
      setUsers(refreshed.users ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    }
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("displayName")}</TableHead>
            <TableHead>{tAuth("email")}</TableHead>
            <TableHead>{t("role")}</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
