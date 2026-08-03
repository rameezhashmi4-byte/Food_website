"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithEmailAction, type EmailSignInState } from "@/actions/auth";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: EmailSignInState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} className="w-full">
      {pending ? "Sending..." : "Email me a sign-in link"}
    </Button>
  );
}

export default function EmailSignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInWithEmailAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormField
        id="email"
        label="Email address"
        helperText="No password needed - we'll email you a one-time link. New here? The same link creates your account."
      >
        <Input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
      </FormField>
      <SubmitButton />
      {state.status === "sent" && <Alert variant="success">{state.message}</Alert>}
      {state.status === "error" && <Alert variant="danger">{state.message}</Alert>}
    </form>
  );
}
