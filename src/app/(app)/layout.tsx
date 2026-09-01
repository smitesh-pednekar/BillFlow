import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SidebarNav, MobileTabBar, UserMenu } from "./nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Fixed rail on desktop */}
      <aside className="no-print hidden w-[240px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Link
            href="/dashboard"
            className="font-display text-lg font-semibold tracking-tight text-ink"
          >
            BillFlow
          </Link>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-line p-3">
          <UserMenu
            name={user.businessName || user.name}
            email={user.email}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="no-print flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Link
            href="/dashboard"
            className="font-display text-base font-semibold text-ink"
          >
            BillFlow
          </Link>
          <UserMenu name={user.businessName || user.name} email={user.email} compact />
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
