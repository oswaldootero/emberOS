export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-ink-950 text-ivory flex flex-col items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
