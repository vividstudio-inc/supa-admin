"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { TargetSetupPanel } from "@/components/connections/target-setup-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { orpcBrowser } from "@/lib/orpc/client.browser";
import { cn } from "@/lib/utils";

type OnboardingSteps = {
  bootstrap: boolean;
  schemaSynced: boolean;
  rolesConfigured: boolean;
  usersProvisioned: boolean;
};

type ConnectionOnboardingWizardProps = {
  connectionId: string;
  connectionName: string;
  steps: OnboardingSteps;
  showBootstrap: boolean;
};

function StepRow({
  step,
  done,
  label,
  action,
}: {
  step: number;
  done: boolean;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          done ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
        )}
      >
        {step}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="size-4 text-brand shrink-0" />
          ) : (
            <Circle className="size-4 text-muted-foreground shrink-0" />
          )}
          <p
            className={cn(
              "font-medium",
              done && "text-muted-foreground line-through",
            )}
          >
            {label}
          </p>
        </div>
        {!done && action}
      </div>
    </div>
  );
}

export function ConnectionOnboardingWizard({
  connectionId,
  connectionName: _connectionName,
  steps,
  showBootstrap,
}: ConnectionOnboardingWizardProps) {
  const t = useTranslations("connections.onboarding");

  async function syncSchema() {
    await orpcBrowser.connections.schemaSync({ id: connectionId });
    window.location.reload();
  }

  return (
    <Card className="max-w-3xl border-border/60">
      <CardHeader>
        <CardTitle>{t("checklist")}</CardTitle>
        <CardDescription>{t("checklistHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StepRow
          step={1}
          done={steps.bootstrap}
          label={t("stepBootstrap")}
          action={
            showBootstrap ? (
              <TargetSetupPanel connectionId={connectionId} />
            ) : undefined
          }
        />
        <StepRow
          step={2}
          done={steps.schemaSynced}
          label={t("stepSchema")}
          action={
            <Button size="sm" variant="outline" onClick={() => syncSchema()}>
              {t("syncSchema")}
            </Button>
          }
        />
        <StepRow
          step={3}
          done={steps.rolesConfigured}
          label={t("stepRoles")}
          action={
            <Button size="sm" variant="outline" render={<Link href="/roles" />}>
              {t("openRoles")}
            </Button>
          }
        />
        <StepRow
          step={4}
          done={steps.usersProvisioned}
          label={t("stepProvision")}
          action={
            <Button size="sm" variant="outline" render={<Link href="/users" />}>
              {t("openUsers")}
            </Button>
          }
        />
        <StepRow
          step={5}
          done={steps.bootstrap && steps.rolesConfigured}
          label={t("stepConnect")}
          action={
            steps.bootstrap ? (
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/${connectionId}/connect`} />}
              >
                {t("openConnect")}
              </Button>
            ) : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
