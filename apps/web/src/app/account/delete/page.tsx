import type { Metadata } from "next";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Delete account" };

export default function DeleteAccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Delete account</h1>
        <p className="mt-1 text-muted">This permanently removes your BiteJoy account. There is no recovery afterwards.</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>What gets deleted</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text">
            <li>Your profile (display name, email, avatar)</li>
            <li>Your preferences</li>
            <li>Every restaurant you&rsquo;ve saved</li>
            <li>Your activity log</li>
            <li>Your sign-in identity itself, so nothing is left to sign back into</li>
          </ul>
          <p className="text-sm text-text">
            <strong>What&rsquo;s retained:</strong> nothing. BiteJoy doesn&rsquo;t keep a backup copy, a
            &ldquo;deleted account&rdquo; record, or any of the above for any legal, billing, or operational reason -
            there is no payment history, no support ticket archive, and no analytics profile tied to your identity.
            Deletion is immediate, not a 30-day soft-delete window.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Confirm deletion</CardTitle>
          <p className="text-sm text-muted">
            As a safeguard against an accidental click, type <strong>DELETE</strong> below to confirm.
          </p>
          <DeleteAccountForm />
        </CardBody>
      </Card>
    </div>
  );
}
