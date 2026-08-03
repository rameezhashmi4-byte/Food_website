import type { Metadata } from "next";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export const metadata: Metadata = { title: "Delete account" };

export default function DeleteAccountPage() {
  return (
    <div className="stack">
      <h1>Delete account</h1>
      <p className="lede">This permanently removes your BiteJoy account. There is no recovery afterwards.</p>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>What gets deleted</h2>
        <ul>
          <li>Your profile (display name, email, avatar)</li>
          <li>Your preferences</li>
          <li>Every restaurant you&rsquo;ve saved</li>
          <li>Your activity log</li>
          <li>Your sign-in identity itself, so nothing is left to sign back into</li>
        </ul>
        <p>
          <strong>What&rsquo;s retained:</strong> nothing. BiteJoy doesn&rsquo;t keep a backup copy, a &ldquo;deleted
          account&rdquo; record, or any of the above for any legal, billing, or operational reason - there is no
          payment history, no support ticket archive, and no analytics profile tied to your identity. Deletion is
          immediate, not a 30-day soft-delete window.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Confirm deletion</h2>
        <p className="hint">
          As a safeguard against an accidental click, type <strong>DELETE</strong> below to confirm.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
