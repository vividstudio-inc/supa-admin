import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <AuthBrandPanel />
      <div className="flex flex-1 flex-col">
        <div className="flex items-center border-b border-border/60 p-4 lg:hidden">
          <BrandLogo compact />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
