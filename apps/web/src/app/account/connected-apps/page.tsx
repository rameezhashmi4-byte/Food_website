import type { Metadata } from "next";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Connected apps" };

export default function ConnectedAppsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Connected apps</h1>
        <p className="mt-1 text-muted">Where your BiteJoy account is currently linked.</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>BiteJoy in ChatGPT</CardTitle>
          <p className="text-sm text-text">
            BiteJoy in ChatGPT uses this same account. When you connect BiteJoy from inside ChatGPT, you&rsquo;ll be
            asked to sign in and authorize it - once you do, the recommendations, saved restaurants and preferences
            you build up are shared between ChatGPT and this website automatically, because it&rsquo;s the same
            account underneath.
          </p>
          <p className="text-sm text-muted">
            The sign-in/authorization step itself happens through ChatGPT and Supabase&rsquo;s own OAuth flow, not on
            this page - this is just where you can see that the connection exists and what it means. Once that flow
            is live, connected apps and the ability to revoke access will be listed here.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Nothing else connected</CardTitle>
          <p className="text-sm text-text">
            BiteJoy doesn&rsquo;t currently connect to any other apps or services on your behalf, and never posts
            anywhere or acts as you without your say-so.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
