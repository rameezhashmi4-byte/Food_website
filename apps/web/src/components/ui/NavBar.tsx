"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { IconMenu, IconX } from "./icons";

export interface NavLink {
  label: string;
  href: string;
}

export interface NavBarUser {
  name?: string | null;
  email: string;
}

export interface NavBarProps {
  links?: NavLink[];
  /** null/undefined renders the signed-out state (Sign in / Sign up). */
  user?: NavBarUser | null;
  /** Preferred over signOutHref when sign-out needs to run client logic before navigating. */
  onSignOut?: () => void;
  signOutHref?: string;
  signInHref?: string;
  signUpHref?: string;
  className?: string;
  /**
   * Full replacement for the built-in sign-out button/link, e.g. a Server
   * Component `<form action={signOutAction}>` wrapping a submit button. When
   * provided, this takes over from onSignOut/signOutHref entirely - it's
   * still safe to pass from a Server Component parent into this Client
   * Component via props/children, same as `user`/`links`.
   */
  signOutSlot?: React.ReactNode;
}

const defaultLinks: NavLink[] = [
  { label: "Discover", href: "/" },
  { label: "Saved", href: "/saved" },
  { label: "Account", href: "/account" },
];

/** Sticky top nav / account shell with a responsive hamburger menu on mobile. */
export function NavBar({
  links = defaultLinks,
  user,
  onSignOut,
  signOutHref = "/logout",
  signInHref = "/login",
  signUpHref = "/signup",
  className,
  signOutSlot,
}: NavBarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 max-w-bj-content items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-text">
          Bite<span className="text-accent">Joy</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="max-w-[160px] truncate text-sm text-muted" title={user.email}>
                {user.name ?? user.email}
              </span>
              {signOutSlot ?? (onSignOut ? (
                <Button size="sm" variant="secondary" onClick={onSignOut}>
                  Sign out
                </Button>
              ) : (
                <Button size="sm" variant="secondary" href={signOutHref}>
                  Sign out
                </Button>
              ))}
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" href={signInHref}>
                Sign in
              </Button>
              <Button size="sm" href={signUpHref}>
                Sign up
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-bj-sm p-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          aria-expanded={open}
          aria-controls="bj-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX width={22} height={22} /> : <IconMenu width={22} height={22} />}
        </button>
      </div>

      {open && (
        <div id="bj-mobile-nav" className="border-t border-border bg-bg px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-bj-sm px-2 py-2.5 text-sm font-medium text-text hover:bg-accent-soft"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            {user ? (
              <>
                <span className="truncate px-2 text-sm text-muted">{user.name ?? user.email}</span>
                {signOutSlot ?? (onSignOut ? (
                  <Button variant="secondary" onClick={onSignOut} className="w-full">
                    Sign out
                  </Button>
                ) : (
                  <Button variant="secondary" href={signOutHref} className="w-full">
                    Sign out
                  </Button>
                ))}
              </>
            ) : (
              <>
                <Button variant="ghost" href={signInHref} className="w-full">
                  Sign in
                </Button>
                <Button href={signUpHref} className="w-full">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
