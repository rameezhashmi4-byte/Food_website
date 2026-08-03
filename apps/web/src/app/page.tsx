import { getCurrentUser } from "@/lib/auth/session";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardDescription, CardTitle } from "@/components/ui/Card";

const steps = [
  {
    title: "Tell BiteJoy what you're after",
    description:
      "Location, budget, mood, cravings — chat with BiteJoy the way you'd text a friend who always knows where to eat.",
  },
  {
    title: "Get picks worth getting excited about",
    description: "Real matches with the reasoning behind each one, not just a list of nearby pins.",
  },
  {
    title: "Save your favorites",
    description: "Keep track of the places you loved, and the ones you're saving for a special occasion.",
  },
];

const moods = ["Date night", "Quick lunch", "Hidden gems", "Celebration", "Working from a café", "Big group"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ accountDeleted?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent-soft blur-3xl dark:opacity-60 sm:-top-32 sm:left-[15%] sm:translate-x-0"
        />
        <div className="relative mx-auto max-w-bj-content px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          {params.accountDeleted === "1" && (
            <Alert variant="success" className="mb-8">
              Your BiteJoy account and everything in it have been deleted. Take care!
            </Alert>
          )}

          <Badge variant="accent">AI-powered food discovery</Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-text sm:text-5xl">
            Where should we eat?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            BiteJoy is your joyful AI food companion. Tell it your location, budget, mood and cravings, and it will
            help you find somewhere worth getting excited about.
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted">
            This website is BiteJoy&rsquo;s account home — sign in to save the places you love and tell it a bit
            about your taste. The actual finding-somewhere-to-eat part happens over in ChatGPT, where BiteJoy lives
            as an app.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <Button size="lg" href="/account">
                Go to my account
              </Button>
            ) : (
              <>
                <Button size="lg" href="/signup">
                  Get started
                </Button>
                <Button size="lg" variant="secondary" href="/login">
                  Log in
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-bj-content px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">How BiteJoy works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardBody>
                <Badge variant="secondary">Step {index + 1}</Badge>
                <CardTitle className="mt-3">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-bj-content px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Whatever the mood, there&apos;s a table for it
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            BiteJoy adapts to how you&apos;re actually feeling, not just what&apos;s nearby.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {moods.map((mood) => (
              <Badge key={mood} variant="accent" className="px-3.5 py-1.5 text-sm">
                {mood}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-bj-content px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardBody>
            <CardTitle className="text-lg">What your BiteJoy account is for</CardTitle>
            <CardDescription>
              Once you&rsquo;re signed in, BiteJoy can remember your favourite cuisines, your usual budget, the
              restaurants you&rsquo;ve saved, and a few preferences that help it recommend better — all in one place,
              shared between this website and the ChatGPT app.
            </CardDescription>
          </CardBody>
        </Card>
      </section>
    </>
  );
}
