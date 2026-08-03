import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary" size="sm" className="w-full">
        Sign out
      </Button>
    </form>
  );
}
