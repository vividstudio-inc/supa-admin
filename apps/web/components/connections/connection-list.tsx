"use client";

import type { Connection } from "@supa-admin/projections";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { orpcBrowser } from "@/lib/orpc/client.browser";

type ConnectionListProps = {
  connections: Pick<Connection, "id" | "name" | "url" | "schema_cached_at">[];
};

export function ConnectionList({ connections }: ConnectionListProps) {
  const t = useTranslations();
  const [rlsSql, setRlsSql] = useState("");
  const [rlsOpen, setRlsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function syncSchema(id: string) {
    try {
      const data = await orpcBrowser.connections.schemaSync({ id });
      toast.success(t("connections.schemaSynced", { count: data.tableCount }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function previewRls(id: string) {
    setActiveId(id);
    try {
      const data = await orpcBrowser.connectionsRls.preview({ id });
      setRlsSql(data.sql ?? "");
      setRlsOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function applyRls() {
    if (!activeId) return;
    try {
      await orpcBrowser.connectionsRls.apply({ id: activeId });
      toast.success(t("common.success"));
      setRlsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function deleteConnection(id: string) {
    try {
      await orpcBrowser.connections.delete({ id });
      window.location.reload();
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("connections.name")}</TableHead>
            <TableHead>{t("connections.url")}</TableHead>
            <TableHead>{t("connections.lastSynced")}</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((conn) => (
            <TableRow key={conn.id}>
              <TableCell>{conn.name}</TableCell>
              <TableCell className="font-mono text-xs">{conn.url}</TableCell>
              <TableCell>
                {conn.schema_cached_at
                  ? new Date(conn.schema_cached_at).toLocaleString()
                  : "-"}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncSchema(conn.id)}
                >
                  {t("connections.syncSchema")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => previewRls(conn.id)}
                >
                  {t("connections.syncRls")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button size="sm" variant="destructive" />}
                  >
                    {t("common.delete")}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("connections.deleteConfirm")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("common.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteConnection(conn.id)}
                      >
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={rlsOpen} onOpenChange={setRlsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("rls.preview")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("rls.warning")}</p>
          <Textarea
            value={rlsSql}
            readOnly
            className="font-mono text-xs min-h-[300px]"
          />
          <div className="flex gap-2">
            <Button onClick={applyRls}>{t("rls.apply")}</Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(rlsSql)}
            >
              {t("rls.copySql")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
