"use client";

import type { BootstrapStatus } from "@supa-admin/projections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plug, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusBadge } from "@/components/patterns/status-badge";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createOrpcQueryOptions,
  orpcQueryKeys,
} from "@/lib/data-layer/orpc-query";
import { orpcBrowser } from "@/lib/orpc/client.browser";
import { TargetSetupDialog } from "./target-setup-dialog";

type ConnectionRow = {
  id: string;
  name: string;
  url: string;
  schema_cached_at: string | null;
  bootstrap_status: BootstrapStatus;
};

type ConnectionListProps = {
  connections?: ConnectionRow[];
};

const orpcOptions = createOrpcQueryOptions(orpcBrowser);

export function ConnectionList({
  connections: initialConnections,
}: ConnectionListProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [rlsSql, setRlsSql] = useState("");
  const [rlsOpen, setRlsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [webhookOpen, setWebhookOpen] = useState(false);

  const { data } = useQuery({
    ...orpcOptions.connections.list,
    enabled: initialConnections === undefined,
    initialData: initialConnections
      ? { connections: initialConnections }
      : undefined,
  });

  const connections = data?.connections ?? initialConnections ?? [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.url.toLowerCase().includes(q),
    );
  }, [connections, filter]);

  async function invalidateConnections() {
    await queryClient.invalidateQueries({
      queryKey: orpcQueryKeys.connections.all(),
    });
  }

  async function syncSchema(id: string) {
    try {
      const result = await orpcBrowser.connections.schemaSync({ id });
      toast.success(
        t("connections.schemaSynced", { count: result.tableCount }),
      );
      await invalidateConnections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function previewRls(id: string) {
    setActiveId(id);
    try {
      const result = await orpcBrowser.connectionsRls.preview({ id });
      setRlsSql(result.sql ?? "");
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
      await invalidateConnections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function deleteConnection(id: string) {
    try {
      await orpcBrowser.connections.delete({ id });
      await invalidateConnections();
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function revealWebhookSecret(id: string) {
    try {
      const result = await orpcBrowser.connections.revealWebhookSecret({ id });
      setWebhookSecret(result.webhookSecret);
      setWebhookOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function rotateWebhookSecret(id: string) {
    try {
      const result = await orpcBrowser.connections.rotateWebhookSecret({ id });
      setWebhookSecret(result.webhookSecret);
      setWebhookOpen(true);
      toast.success(t("common.success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  function openSetup(id: string) {
    setActiveId(id);
    setSetupOpen(true);
  }

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title={t("connections.emptyTitle")}
        description={t("connections.emptyDescription")}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Input
          placeholder={t("common.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} {t("table.rows")}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>{t("connections.name")}</TableHead>
              <TableHead>{t("connections.url")}</TableHead>
              <TableHead>{t("connections.status")}</TableHead>
              <TableHead>{t("connections.lastSynced")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((conn) => (
              <TableRow key={conn.id} className="hover:bg-muted/20">
                <TableCell className="font-medium">{conn.name}</TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-xs">
                  {conn.url}
                </TableCell>
                <TableCell>
                  {conn.bootstrap_status === "pending" ? (
                    <StatusBadge
                      status="pending"
                      label={t("connections.bootstrap.setupRequired")}
                    />
                  ) : (
                    <StatusBadge
                      status="ready"
                      label={t("connections.bootstrap.ready")}
                    />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {conn.schema_cached_at
                    ? new Date(conn.schema_cached_at).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {conn.bootstrap_status === "pending" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openSetup(conn.id)}
                      >
                        {t("connections.bootstrap.setup")}
                      </Button>
                    )}
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
                      disabled={conn.bootstrap_status !== "ready"}
                    >
                      {t("connections.syncRls")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revealWebhookSecret(conn.id)}
                      disabled={conn.bootstrap_status !== "ready"}
                    >
                      <KeyRound className="size-3.5" />
                      {t("connections.webhookSecret.reveal")}
                    </Button>
                    <div className="contents">
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={conn.bootstrap_status !== "ready"}
                            />
                          }
                        >
                          <RotateCw className="size-3.5" />
                          {t("connections.webhookSecret.rotate")}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("connections.webhookSecret.rotateConfirm")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("connections.webhookSecret.rotateWarning")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("common.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => rotateWebhookSecret(conn.id)}
                            >
                              {t("connections.webhookSecret.rotate")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="contents">
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            />
                          }
                        >
                          {t("common.delete")}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("common.confirm")}
                            </AlertDialogTitle>
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
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {activeId && (
        <TargetSetupDialog
          connectionId={activeId}
          open={setupOpen}
          onOpenChange={setSetupOpen}
        />
      )}

      <Dialog open={rlsOpen} onOpenChange={setRlsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("rls.preview")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("rls.warning")}</p>
          <Textarea
            value={rlsSql}
            readOnly
            className="min-h-[300px] font-mono text-xs"
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

      <Dialog
        open={webhookOpen}
        onOpenChange={(open) => {
          setWebhookOpen(open);
          if (!open) setWebhookSecret(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("connections.webhookSecret.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("connections.webhookSecret.oneTimeHint")}
          </p>
          <Input
            readOnly
            value={webhookSecret ?? ""}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (webhookSecret) {
                void navigator.clipboard.writeText(webhookSecret);
                toast.success(t("common.success"));
              }
            }}
          >
            {t("rls.copySql")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
