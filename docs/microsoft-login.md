# Microsoft login setup

BiteJoy delegates Microsoft sign-in entirely to Supabase Auth, using
Supabase's **Azure** provider (Microsoft identity platform / Azure AD is
what Supabase calls `azure` internally - the dashboard section is labelled
"Azure" even though the user-facing product is "Sign in with Microsoft").

**Live-verified for this project:** a real, unauthenticated request to
`<SUPABASE_URL>/auth/v1/settings` returns `"external": { "azure": true,
... }`, confirming the provider is genuinely enabled on this Supabase
project.

## 1. Register an app in Microsoft Entra ID (Azure AD)

In the [Azure Portal](https://portal.azure.com/) → Microsoft Entra ID →
App registrations:

1. New registration. Supported account types: choose based on who should
   be able to sign in (personal Microsoft accounts, a single
   organization's directory, or any organizational directory + personal
   accounts - BiteJoy is a public app, so "any organizational directory
   and personal Microsoft accounts" is the usual choice).
2. **Redirect URI**: platform "Web", value `<SUPABASE_URL>/auth/v1/callback`
   (Supabase's callback - same pattern as Google).
3. After creation, note the **Application (client) ID**.
4. Certificates & secrets → New client secret → note the generated value
   (shown once).

## 2. Configure it in Supabase

Dashboard → Authentication → Providers → Azure:

- Toggle it on.
- Client ID = the Application (client) ID from step 1.
- Client Secret = the value from step 1.
- Azure Tenant URL / directory (if prompted): use `common` for the
  "any Microsoft account" registration type above, or the specific tenant
  ID for a single-org restriction.
- Save.

As with Google, this is the only place these credentials are used at
runtime - `apps/web` calls `supabase.auth.signInWithOAuth({ provider:
"azure" })` and Supabase performs the actual token exchange with
Microsoft.

## 3. Record the values in `.env` (reference only)

`MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` in
`.env.example` are a record of what's configured in the Supabase dashboard
above, not something application code reads directly.

## 4. Local development without Microsoft configured

Same convention as Google: if not configured, the "Continue with
Microsoft" button on `/login` renders disabled/"not configured" instead of
erroring when clicked.

## Testing

1. Visit `/login`.
2. Click "Continue with Microsoft".
3. Complete the Microsoft consent screen.
4. Confirm redirect back to `AUTH_REDIRECT_URL` and a signed-in session on
   `/account`.

Like Google, this requires a real browser and a real Microsoft account and
has not been run end-to-end from this development environment. The
provider's live enablement on the Supabase side has been verified (above).
