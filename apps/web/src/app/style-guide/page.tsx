"use client";

/**
 * Component showcase for the BiteJoy web design system - not linked from
 * any nav, purely a live reference so new pages reuse this kit's proven
 * components/spacing instead of guessing at markup from scratch. Every
 * example uses realistic BiteJoy copy instead of "Lorem ipsum" placeholders.
 */

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { IconBookmark } from "@/components/ui/icons";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-bold tracking-tight text-text">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3 rounded-bj-sm border border-border bg-surface p-3">
      <div className={`h-10 w-10 flex-shrink-0 rounded-bj-sm ${className}`} />
      <code className="text-xs text-muted">{name}</code>
    </div>
  );
}

const colorGroups: { title: string; tokens: { name: string; className: string }[] }[] = [
  {
    title: "Accent (brand)",
    tokens: [
      { name: "accent-soft", className: "bg-accent-soft" },
      { name: "accent", className: "bg-accent" },
      { name: "accent-strong", className: "bg-accent-strong" },
    ],
  },
  {
    title: "Secondary",
    tokens: [
      { name: "secondary-soft", className: "bg-secondary-soft" },
      { name: "secondary", className: "bg-secondary" },
      { name: "secondary-strong", className: "bg-secondary-strong" },
    ],
  },
  {
    title: "Success",
    tokens: [
      { name: "success-soft", className: "bg-success-soft" },
      { name: "success", className: "bg-success" },
      { name: "success-strong", className: "bg-success-strong" },
    ],
  },
  {
    title: "Warning",
    tokens: [
      { name: "warn-soft", className: "bg-warn-soft" },
      { name: "warn", className: "bg-warn" },
      { name: "warn-strong", className: "bg-warn-strong" },
    ],
  },
  {
    title: "Danger",
    tokens: [
      { name: "danger-soft", className: "bg-danger-soft" },
      { name: "danger", className: "bg-danger" },
      { name: "danger-strong", className: "bg-danger-strong" },
    ],
  },
  {
    title: "Neutral",
    tokens: [
      { name: "bg", className: "bg-bg border border-border" },
      { name: "surface", className: "bg-surface border border-border" },
      { name: "border", className: "bg-border" },
    ],
  },
];

export default function StyleGuidePage() {
  const [dismissibleVisible, setDismissibleVisible] = React.useState(true);
  const [showFieldError, setShowFieldError] = React.useState(true);

  return (
    <main className="mx-auto max-w-bj-content px-4 pb-24 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12">
        <Badge variant="accent">Design system</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">BiteJoy style guide</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Every component in apps/web&apos;s UI kit, ported from the ChatGPT widget&apos;s established brand
          language and extended for a full website. Resize the window or toggle your OS theme — everything here
          is driven by the same CSS tokens in src/app/globals.css.
        </p>
      </div>

      <Section
        title="Color tokens"
        description="Each swatch is a live CSS variable — it already reflects your current light/dark mode."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {colorGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-sm font-semibold text-text">{group.title}</h3>
              <div className="flex flex-col gap-2">
                {group.tokens.map((token) => (
                  <Swatch key={token.name} {...token} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-4">
          <p className="text-5xl font-bold tracking-tight text-text">Display / Hero headline</p>
          <p className="text-4xl font-bold tracking-tight text-text">H1 — Page title</p>
          <p className="text-2xl font-bold tracking-tight text-text">H2 — Section heading</p>
          <p className="text-base font-semibold text-text">H3 — Card / subsection title</p>
          <p className="max-w-xl text-base leading-relaxed text-text">
            Body text. BiteJoy finds restaurants worth getting excited about by understanding your location,
            budget, mood and cravings — then explaining exactly why each pick fits.
          </p>
          <p className="text-sm text-muted">Small / meta text — e.g. &quot;Italian · $$ · 0.6 mi away&quot;</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Micro / tag text</p>
        </div>
      </Section>

      <Section title="Buttons" description="Primary, secondary, ghost and danger variants, each in three sizes.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Save restaurant</Button>
            <Button variant="secondary">Maybe later</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete account</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button isLoading>Saving…</Button>
            <Button disabled>Disabled</Button>
            <Button href="/signup">Renders as a link (href=&quot;/signup&quot;)</Button>
          </div>
        </div>
      </Section>

      <Section
        title="Form fields"
        description="FormField wires up label, helper/error text and aria-describedby/aria-invalid automatically."
      >
        <div className="grid max-w-xl gap-5">
          <FormField id="sg-name" label="Full name" required>
            <Input placeholder="Ada Lovelace" />
          </FormField>
          <FormField id="sg-email" label="Email" helperText="We'll only use this to send you saved-restaurant updates.">
            <Input type="email" placeholder="ada@example.com" />
          </FormField>
          <FormField
            id="sg-budget"
            label="Budget"
            errorText={showFieldError ? "Pick at least one budget level." : undefined}
          >
            <Input placeholder="$$" invalid={showFieldError} />
          </FormField>
          <button
            type="button"
            onClick={() => setShowFieldError((v) => !v)}
            className="w-fit text-xs font-medium text-accent-strong underline underline-offset-2"
          >
            Toggle error state
          </button>
          <FormField id="sg-notes" label="Anything else BiteJoy should know?" helperText="Optional.">
            <Textarea placeholder="I'm vegetarian and I love a good patio." />
          </FormField>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>The Copper Fig</CardTitle>
              <Badge variant="accent">92% match</Badge>
            </CardHeader>
            <CardBody>
              <CardDescription>New American · $$$ · 1.2 mi away</CardDescription>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="success" dot>
                  Open now
                </Badge>
                <Badge>Outdoor seating</Badge>
                <Badge>Great for groups</Badge>
              </div>
            </CardBody>
            <CardFooter>
              <Button size="sm">Save</Button>
              <Button size="sm" variant="secondary">
                Directions
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Update the cuisines, budget and dietary needs BiteJoy uses to personalize your matches.
              </CardDescription>
            </CardBody>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Edit preferences
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>Connected apps</CardTitle>
              <CardDescription>BiteJoy is connected to ChatGPT. Revoke access any time.</CardDescription>
              <Badge variant="secondary">1 connected app</Badge>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Badges / tags" description="Pill-shaped labels, matching the widget's tag and status chips.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Vegetarian friendly</Badge>
          <Badge variant="accent">Editor&apos;s pick</Badge>
          <Badge variant="secondary">Quick bite</Badge>
          <Badge variant="success" dot>
            Open now
          </Badge>
          <Badge variant="warn" dot>
            Closes soon
          </Badge>
          <Badge variant="danger" dot>
            Closed
          </Badge>
        </div>
      </Section>

      <Section title="Empty states" description="Friendly, purposeful copy with an optional action — not bare text.">
        <div className="grid gap-5 sm:grid-cols-2">
          <EmptyState
            title="No saved restaurants yet"
            description="When you find somewhere worth getting excited about, save it here so it's easy to find again."
            action={{ label: "Start exploring", href: "/" }}
          />
          <EmptyState
            icon={<IconBookmark width={22} height={22} />}
            title="No connected apps"
            description="Connect BiteJoy to ChatGPT to get personalized recommendations right inside a conversation."
            action={{ label: "Connect ChatGPT", href: "/account/connected-apps" }}
            secondaryAction={{ label: "Learn more", href: "/privacy" }}
          />
        </div>
      </Section>

      <Section title="Alerts" description="Inline feedback for forms and pages — success, info, warning, danger.">
        <div className="flex flex-col gap-3">
          <Alert variant="success" title="Preferences saved">
            BiteJoy will use these next time you ask for a recommendation.
          </Alert>
          <Alert variant="info">You&apos;re signed in as rameez@example.com.</Alert>
          <Alert variant="warning" title="Unsaved changes">
            You have preference changes that haven&apos;t been saved yet.
          </Alert>
          <Alert variant="danger" title="Couldn't save your changes">
            Something went wrong on our end — please try again in a moment.
          </Alert>
          {dismissibleVisible && (
            <Alert variant="info" onDismiss={() => setDismissibleVisible(false)}>
              Dismissible example — click the × to hide this one.
            </Alert>
          )}
        </div>
      </Section>
    </main>
  );
}
