import Link from "next/link";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Connected apps", href: "/account/connected-apps" },
  { label: "Account", href: "/account" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-bj-content flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-base font-bold text-text">
            Bite<span className="text-accent">Joy</span>
          </p>
          <p className="mt-1 text-sm text-muted">Your joyful AI food companion.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted">© {new Date().getFullYear()} BiteJoy</p>
      </div>
    </footer>
  );
}
