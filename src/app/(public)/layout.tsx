import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-ink-950 text-ivory flex flex-col items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute top-4 right-4" />
      {children}
    </main>
  );
}
