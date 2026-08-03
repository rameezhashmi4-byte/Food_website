# Google login setup

BiteJoy delegates Google sign-in entirely to Supabase Auth - the website
never talks to Google directly, and never sees a Google client secret at
runtime.

**Live-verified for this project:** a real, unauthenticated request to
`<SUPABASE_URL>/auth/v1/settings` (with just the `apikey` header) returns
`"external": { "google": true, ... }`, confirming the Google provider is
genuinely enabled on this Supabase project - not just configured in
`.env` and untested.

## 1. Create Google OAuth credentials

In the [Google Cloud Console](https://console.cloud.google.com/):

1. Create (or reuse) a project.
2. APIs & Services → OAuth consent screen: configure it (External user
   type is fine for a public app), add the app name, support email, and
   the scopes `email`, `profile`, `openid` (Supabase requests these by
   default).
3. APIs & Services → Credentials → Create OAuth client ID → Web
   application.
4. **Authorized redirect URI**: `<SUPABASE_URL>/auth/v1/callback` (this is
   Supabase's callback, not BiteJoy's - Supabase completes the Google
   exchange itself, then redirects on to BiteJoy's own
   `AUTH_REDIRECT_URL`).
5. Note the generated Client ID and Client Secret.

## 2. Configure it in Supabase

Dashboard → Authentication → Providers → Google:

- Toggle it on.
- Paste the Client ID and Client Secret from step 1.
- Save.

This is the ONLY place these credentials are actually used at runtime -
Supabase's own auth server performs the OAuth exchange with Google.
BiteJoy's application code just calls `supabase.auth.signInWithOAuth({
provider: "google" })` and handles the resulting session.

## 3. Record the values in `.env` (reference only)

`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` in `.env.example`
exist purely as a record of what should be configured in the Supabase
dashboard above - `apps/web` and `apps/mcp-server` do not read these
values themselves. Keeping them recorded means a redeploy or a new team
member knows what to re-enter without having to regenerate credentials.

## 4. Local development without Google configured

If `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` aren't set (or the provider isn't
enabled in the connected Supabase project), `apps/web`'s login page shows
the Google button in a disabled "not configured" state rather than a
button that fails when clicked - see the login page implementation for the
exact env check used. The build must not fail just because this provider
isn't configured for a given environment.

## Testing

1. Visit `/login`.
2. Click "Continue with Google".
3. Complete Google's consent screen.
4. Confirm redirect back to `AUTH_REDIRECT_URL` and that `/account` shows a
   signed-in session.

This flow requires a real browser and a real Google account - it has not
been run end-to-end from this development environment (no browser access
here). What HAS been verified live: the provider is genuinely enabled on
the Supabase side (see above), and Supabase's OAuth discovery endpoints
respond correctly (see [docs/mcp-oauth.md](mcp-oauth.md)).
