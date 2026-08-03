import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/account", label: "Profile" },
  { href: "/account/preferences", label: "Preferences" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/connected-apps", label: "Connected apps" },
  { href: "/account/delete", label: "Delete account" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Second, independent check beyond proxy.ts - see the comment there.
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav
        className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4 text-sm"
        aria-label="Account"
      >
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-muted transition-colors hover:text-accent">
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
