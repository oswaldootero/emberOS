import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentUser } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-screen flex">
      <Sidebar isAdmin={user?.role === "ADMIN"} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user ? { email: user.email, fullName: user.fullName } : null}
        />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
