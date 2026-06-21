"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/patterns/loading-button";
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
import { createTargetBrowserClient } from "@/lib/supabase/target/client";

type ConnectFormProps = {
  connectionId: string;
  url: string;
  anonKey: string;
};

function mapSyncError(message: string, t: ReturnType<typeof useTranslations>) {
  if (message.includes("provision")) {
    return t("provisionRequired");
  }
  if (message.includes("bootstrap")) {
    return t("bootstrapRequired");
  }
  if (message.includes("Email does not match")) {
    return t("emailMismatch");
  }
  return message;
}

export function ConnectForm({ connectionId, url, anonKey }: ConnectFormProps) {
  const t = useTranslations("connect");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const client = createTargetBrowserClient(url, anonKey);
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      toast.error(signInError.message);
      return;
    }

    try {
      await orpcBrowser.connections.target.syncPermissions({
        connectionId,
        targetEmail: email,
      });
    } catch (err) {
      await client.auth.signOut();
      setLoading(false);
      const message = err instanceof Error ? err.message : t("syncFailed");
      toast.error(mapSyncError(message, t));
      return;
    }

    const { error: refreshError } = await client.auth.refreshSession();
    setLoading(false);

    if (refreshError) {
      toast.error(refreshError.message);
      return;
    }

    toast.success(t("connected"));
    router.push(`/${connectionId}`);
    router.refresh();
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText={t("connect")}
          >
            {t("connect")}
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
