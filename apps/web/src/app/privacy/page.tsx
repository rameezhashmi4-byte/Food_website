import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Privacy</h1>
        <p className="mt-2 max-w-xl text-lg text-muted">
          BiteJoy is built to hold as little about you as it needs to be useful. This page is a plain-language,
          honest account of what that means in practice.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-text">What BiteJoy stores</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text">
          <li>
            <strong>Your profile</strong> - display name, email, avatar (if your sign-in provider gives us one),
            and which provider you signed in with.
          </li>
          <li>
            <strong>Your preferences</strong> - anything you choose to fill in on the preferences page: budget,
            search radius, favourite cuisines, dietary needs, food and drink preferences, atmosphere, common
            occasions, parking importance, accessibility requirements, and a home/work area if you give one.
            Every field there is optional.
          </li>
          <li>
            <strong>Restaurants you save</strong> - which restaurant, and when.
          </li>
          <li>
            <strong>Minimal structured activity</strong> - a short log of account-level events (e.g. &ldquo;preferences
            updated&rdquo;, &ldquo;restaurant saved&rdquo;) used only to keep the product itself working correctly, not
            for tracking or advertising.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-text">What BiteJoy does not store</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text">
          <li>Raw ChatGPT conversations - BiteJoy in ChatGPT only ever sends structured search criteria, never a transcript.</li>
          <li>Access or refresh tokens in application logs - session tokens live only in your browser&rsquo;s cookies, never printed to logs.</li>
          <li>Payment details - BiteJoy doesn&rsquo;t take payments or bookings.</li>
          <li>A password - sign-in is via Google, Microsoft, or an emailed one-time link, so there&rsquo;s no password to store.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-text">Who can see it</h2>
        <p className="mt-3 text-text">
          Your profile, preferences, saved restaurants and activity are only ever readable by you - enforced at the
          database level (Postgres row-level security), not just in this app&rsquo;s code.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-text">Requesting deletion</h2>
        <p className="mt-3 text-text">
          You can permanently delete your account and everything above at any time from{" "}
          <a className="text-accent hover:underline" href="/account/delete">
            Account → Delete account
          </a>
          . It removes your profile, preferences, saved restaurants and activity log immediately, and then removes
          your sign-in identity itself - nothing is kept in a &ldquo;soft-deleted&rdquo; state waiting to be purged
          later. Given how little BiteJoy stores in the first place, there is nothing left behind afterwards.
        </p>
      </section>
    </div>
  );
}
