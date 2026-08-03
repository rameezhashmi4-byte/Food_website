"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccountAction, type DeleteAccountState } from "@/actions/account";

const initialState: DeleteAccountState = { status: "idle" };

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button button--danger" disabled={pending}>
      {pending ? "Deleting..." : "Permanently delete my account"}
    </button>
  );
}

export default function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={formAction} className="stack">
      <div className="field">
        <label htmlFor="confirmation">
          Type <strong>DELETE</strong> to confirm
        </label>
        <input type="text" id="confirmation" name="confirmation" autoComplete="off" required />
      </div>
      <ConfirmButton />
      {state.status === "error" && (
        <p className="notice notice--error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
