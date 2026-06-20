import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SupaAdmin",
  description: "Multi-connection Supabase admin panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
