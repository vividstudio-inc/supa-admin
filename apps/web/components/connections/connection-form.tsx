"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { orpcBrowser } from "@/lib/orpc/client.browser";

export function ConnectionForm() {
  const t = useTranslations("connections");
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await orpcBrowser.connections.create({
        name,
        url,
        anonKey,
        serviceRoleKey,
      });
      setLoading(false);
      toast.success(t("schemaSynced", { count: data.tableCount ?? 0 }));
      router.push("/connections");
      router.refresh();
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : t("grantHint"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("add")}</CardTitle>
        <CardDescription>{t("grantHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("url")}</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("anonKey")}</Label>
            <Input
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              type="password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("serviceRoleKey")}</Label>
            <Input
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              type="password"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : t("testConnection")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
