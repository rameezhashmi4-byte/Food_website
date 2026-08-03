"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccountAction, type DeleteAccountState } from "@/actions/account";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: DeleteAccountState = { status: "idle" };

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" isLoading={pending}>
      {pending ? "Deleting..." : "Permanently delete my account"}
    </Button>
  );
}

export default function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField id="confirmation" label="Type DELETE to confirm">
        <Input type="text" name="confirmation" autoComplete="off" required />
      </FormField>
      <div>
        <ConfirmButton />
      </div>
      {state.status === "error" && <Alert variant="danger">{state.message}</Alert>}
    </form>
  );
}
