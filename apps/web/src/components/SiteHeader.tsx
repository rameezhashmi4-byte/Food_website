import { getCurrentUser } from "@/lib/auth/session";
import { NavBar, type NavLink } from "@/components/ui/NavBar";
import SignOutButton from "@/components/SignOutButton";

const accountLinks: NavLink[] = [
  { label: "Account", href: "/account" },
  { label: "Preferences", href: "/account/preferences" },
  { label: "Saved", href: "/account/saved" },
];

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <NavBar
      links={user ? accountLinks : []}
      user={user ? { email: user.email ?? "" } : null}
      signOutSlot={user ? <SignOutButton /> : undefined}
    />
  );
}
