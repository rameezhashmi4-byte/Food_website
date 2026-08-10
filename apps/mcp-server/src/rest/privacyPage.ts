/**
 * BiteJoy's real privacy policy, served as a plain HTML page directly from
 * this server (GET /privacy in http.ts) - not via apps/web (Next.js/Vercel,
 * deployment status unconfirmed) or a Claude Artifact (confirmed live to
 * send `X-Robots-Tag: none`, which the GPT Store's automated privacy-policy
 * check appears to reject even though the page itself loads fine for a
 * human or a plain HTTP client). This page sets no such header - it's a
 * completely ordinary, crawlable, publicly-indexable page, on the same
 * domain already used for everything else BiteJoy serves.
 *
 * Source of truth for this text: apps/web/src/app/privacy/page.tsx (the
 * "real" home for this content once that deployment is confirmed live) -
 * kept in sync by hand since one is JSX and the other is a plain string;
 * if the policy text changes, update both.
 */
export const PRIVACY_POLICY_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BiteJoy Privacy Policy</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    background: #fbf7f2;
    color: #2b2420;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #1c1815; color: #f3ece3; }
    a { color: #e88350; }
    .card { background: #262019; border-color: #3a322a; }
  }
  main { max-width: 720px; margin: 0 auto; padding: 48px 20px 96px; }
  h1 { font-size: 2rem; margin: 0 0 4px; }
  h2 { font-size: 1.3rem; margin: 40px 0 12px; }
  h3 { font-size: 1.05rem; margin: 20px 0 6px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 6px; }
  a { color: #b84f24; }
  .updated { color: #6b5f55; font-size: 0.9rem; margin-bottom: 32px; }
  .card { border: 1px solid #ede4da; border-radius: 12px; padding: 18px 20px; margin-top: 16px; }
</style>
</head>
<body>
<main>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: 10 August 2026</p>

  <h2>1. About BiteJoy</h2>
  <p>BiteJoy is a food discovery and recommendation service that helps users discover restaurants, hidden gems and places to eat based on factors such as their location, searches and food preferences.</p>
  <p>BiteJoy may be available through its website, applications, ChatGPT integrations and other supported services.</p>
  <p>BiteJoy is currently operated by an individual based in the United Kingdom.</p>
  <p>For the purposes of applicable UK data protection law, including the UK General Data Protection Regulation ("UK GDPR") and the Data Protection Act 2018, the operator of BiteJoy is the <strong>data controller</strong> for personal information where BiteJoy determines how and why that information is processed.</p>
  <p><strong>Privacy contact:</strong> <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a></p>

  <h2>2. Information We Collect</h2>
  <p>Depending on how you use BiteJoy, we may collect and process the following categories of personal information.</p>

  <h3>Account and Profile Information</h3>
  <p>This may include:</p>
  <ul><li>Your name</li><li>Email address</li><li>Account identifier</li><li>Profile information</li><li>Authentication information</li><li>Account preferences</li></ul>

  <h3>Food and Dining Preferences</h3>
  <p>This may include information you choose to provide about:</p>
  <ul><li>Preferred cuisines</li><li>Dietary preferences</li><li>Food preferences</li><li>Restaurant preferences</li><li>Saved restaurants</li><li>Favourite or saved places</li><li>Dining preferences</li></ul>
  <p>We use this information primarily to personalise BiteJoy and provide more relevant recommendations.</p>

  <h3>Location Information</h3>
  <p>BiteJoy may process your location or an area that you provide when you use location-based features. This may include information used to:</p>
  <ul><li>Find restaurants near you</li><li>Find nearby hidden gems</li><li>Provide local recommendations</li><li>Determine relevant places in a particular area</li><li>Provide maps or directions</li><li>Improve the relevance of search results</li></ul>
  <p>Where supported, you may be able to enter a location manually instead of providing device location information.</p>

  <h3>Search and Usage Information</h3>
  <p>We may process information about how you use BiteJoy, including:</p>
  <ul><li>Restaurant searches</li><li>Food-related searches and queries</li><li>Locations searched</li><li>Recommendations viewed</li><li>Restaurants or places saved</li><li>Interactions with BiteJoy features</li></ul>

  <h3>Technical Information</h3>
  <p>When you access BiteJoy online, limited technical information may also be processed by BiteJoy or its service providers. This may include information such as device or browser information, IP address, security information, logs and information necessary to operate and protect the service.</p>

  <h2>3. How We Use Your Information</h2>
  <p>We may use personal information to:</p>
  <ul><li>Provide BiteJoy's food discovery service</li><li>Generate personalised restaurant recommendations</li><li>Find restaurants and places relevant to your location</li><li>Remember your preferences</li><li>Save restaurants and places to your account</li><li>Create and manage user accounts</li><li>Authenticate users</li><li>Provide maps, places and location functionality</li><li>Respond to user requests</li><li>Maintain and improve BiteJoy</li><li>Diagnose technical problems</li><li>Maintain the security and integrity of the service</li><li>Prevent fraud, abuse and misuse</li><li>Comply with applicable legal obligations</li></ul>
  <p>BiteJoy does <strong>not sell your personal information</strong>.</p>

  <h2>4. Our Lawful Bases Under UK GDPR</h2>
  <p>Where UK GDPR applies, BiteJoy must have a lawful basis for processing personal information. Depending on the processing activity, we may rely on the following lawful bases.</p>

  <h3>Contract</h3>
  <p>We may process information where it is necessary to provide BiteJoy functionality that you request. For example:</p>
  <ul><li>Creating and managing your account</li><li>Saving restaurants</li><li>Remembering your account preferences</li><li>Processing a restaurant search</li><li>Providing requested personalised recommendations</li></ul>

  <h3>Legitimate Interests</h3>
  <p>We may process certain information where necessary for BiteJoy's legitimate interests, provided those interests are not overridden by your rights and freedoms. These interests may include:</p>
  <ul><li>Maintaining and improving BiteJoy</li><li>Understanding how the service is used</li><li>Preventing fraud and abuse</li><li>Maintaining service security</li><li>Diagnosing technical problems</li><li>Improving recommendation quality</li></ul>
  <p>Where required, we consider the impact of this processing on users before relying on legitimate interests.</p>

  <h3>Consent</h3>
  <p>Where required by applicable law, we may ask for your consent before processing particular information or using certain technologies. Where processing relies on consent, you may withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing carried out before consent was withdrawn.</p>

  <h3>Legal Obligation</h3>
  <p>We may process information where necessary to comply with a legal obligation that applies to BiteJoy.</p>

  <h2>5. Personalised Recommendations</h2>
  <p>One of BiteJoy's main purposes is to provide personalised food and restaurant recommendations. Recommendations may take into account information such as:</p>
  <ul><li>Your food preferences</li><li>Dietary preferences</li><li>Saved restaurants</li><li>Search history</li><li>Location or requested search area</li><li>Previous interactions with BiteJoy</li></ul>
  <p>BiteJoy may use automated systems to rank, filter or recommend restaurants and places. These recommendations are intended to assist food discovery. BiteJoy does not currently intend to use this automated recommendation process to make decisions that produce legal effects or similarly significant effects concerning users.</p>

  <h2>6. Supabase</h2>
  <p>BiteJoy uses <strong>Supabase</strong> to provide backend technology and infrastructure. Depending on the BiteJoy features you use, Supabase may process or store information relating to:</p>
  <ul><li>User authentication</li><li>User accounts</li><li>Profiles</li><li>Food preferences</li><li>Saved restaurants and places</li><li>Application data</li><li>Database records</li><li>Security and technical information</li></ul>
  <p>Supabase processes information according to its applicable privacy, security and contractual arrangements.</p>

  <h2>7. Google Services</h2>
  <p>BiteJoy uses <strong>Google services</strong> to provide certain functionality. Depending on the features you use, Google services may assist BiteJoy with:</p>
  <ul><li>Authentication</li><li>Restaurant information</li><li>Place information</li><li>Location searches</li><li>Maps</li><li>Directions</li><li>Food and restaurant discovery</li><li>Related location functionality</li></ul>
  <p>Information necessary to provide these functions may be transmitted to and processed by Google. Google's processing of information is also subject to its applicable privacy policies and terms.</p>

  <h2>8. OpenAI and ChatGPT</h2>
  <p>BiteJoy may be available through ChatGPT or other OpenAI services. When you choose to interact with BiteJoy through ChatGPT, information necessary to fulfil your request may be transmitted between ChatGPT and BiteJoy. Depending on the request, this may include:</p>
  <ul><li>Restaurant searches</li><li>Food-related queries</li><li>Location or search-area information</li><li>Food preferences</li><li>Dietary preferences</li><li>Restaurant preferences</li><li>Requests to save or retrieve restaurants</li><li>Other information necessary to provide the requested functionality</li></ul>
  <p>Your use of ChatGPT is also subject to OpenAI's applicable terms and privacy policies. BiteJoy only intends to request information reasonably necessary to provide its functionality.</p>

  <h2>9. Authentication</h2>
  <p>BiteJoy may support authentication using third-party providers, including Google or other supported login providers. When you use third-party authentication, BiteJoy may receive information required to identify and authenticate your account, such as your name, email address and account identifier. BiteJoy does not receive your third-party account password. Authentication information may be processed using Supabase.</p>

  <h2>10. Sharing Your Information</h2>
  <p>BiteJoy does not sell personal information. We may share or allow personal information to be processed by service providers where reasonably necessary to operate BiteJoy. These may include:</p>
  <ul>
    <li><strong>Supabase</strong> &mdash; database, authentication and backend infrastructure</li>
    <li><strong>Google services</strong> &mdash; maps, places, location, authentication and related functionality</li>
    <li><strong>OpenAI/ChatGPT</strong> &mdash; when BiteJoy is accessed through ChatGPT or relevant OpenAI functionality</li>
    <li>Hosting and technical infrastructure providers necessary to operate BiteJoy</li>
  </ul>
  <p>We may also disclose information where required by law or where reasonably necessary to protect the rights, security or integrity of BiteJoy, its users or others.</p>

  <h2>11. International Data Transfers</h2>
  <p>BiteJoy is intended for users worldwide and uses technology providers that may operate infrastructure in multiple countries. As a result, personal information may be processed in countries other than the country where you live, including potentially outside the United Kingdom or European Economic Area.</p>
  <p>Where UK data protection law requires safeguards for an international transfer, BiteJoy will seek to rely on an applicable lawful transfer mechanism or safeguards provided through its service providers. These may include applicable adequacy regulations, contractual protections or other legally recognised transfer mechanisms.</p>

  <h2>12. How Long We Keep Information</h2>
  <p>BiteJoy does not intend to retain personal information for longer than reasonably necessary. Retention depends on why the information was collected. For example:</p>
  <ul><li>Account information may be retained while your account remains active</li><li>Preferences and saved restaurants may be retained while needed to provide your personalised account</li><li>Search and usage information may be retained for a reasonable period to operate, secure and improve BiteJoy</li><li>Security records and technical logs may be retained for a limited period for security, troubleshooting and fraud prevention</li><li>Information may be retained for longer where required by law or necessary to establish, exercise or defend legal claims</li></ul>
  <p>When information is no longer required, we may delete or anonymise it where appropriate.</p>

  <h2>13. Your UK Data Protection Rights</h2>
  <p>Where UK data protection law applies, you may have rights including:</p>
  <h3>Right of Access</h3><p>You may request a copy of personal information BiteJoy holds about you.</p>
  <h3>Right to Rectification</h3><p>You may ask us to correct inaccurate or incomplete personal information.</p>
  <h3>Right to Erasure</h3><p>In certain circumstances, you may ask us to delete personal information concerning you.</p>
  <h3>Right to Restriction</h3><p>In certain circumstances, you may ask us to restrict how your personal information is processed.</p>
  <h3>Right to Data Portability</h3><p>Where applicable, you may request certain information you provided to BiteJoy in a structured, commonly used and machine-readable format.</p>
  <h3>Right to Object</h3><p>Where processing is based on legitimate interests, you may have the right to object to that processing.</p>
  <h3>Right to Withdraw Consent</h3><p>Where processing relies upon your consent, you may withdraw that consent at any time.</p>
  <h3>Rights Relating to Automated Decision-Making</h3><p>Where applicable, you may have rights relating to decisions made solely using automated processing that produce legal or similarly significant effects.</p>
  <p>To exercise a privacy right, contact: <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a></p>
  <p>We may need to verify your identity before fulfilling certain requests. Requests will be handled within the time periods required by applicable data protection law.</p>

  <h2>14. Rights of Users Outside the United Kingdom</h2>
  <p>BiteJoy is intended to be accessible to users worldwide. Depending on where you live, you may have additional privacy rights under your local laws. Where applicable, BiteJoy will seek to honour legally required rights concerning access, correction, deletion or other control over your personal information.</p>
  <p>You can submit privacy requests to: <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a></p>

  <h2>15. Location Privacy</h2>
  <p>Location information is used to provide relevant restaurant and food discovery functionality. BiteJoy does not sell your location information to advertisers.</p>
  <p>Where available, you may provide a location manually rather than allowing access to your device location. You can also use your device or browser settings to control location permissions. Disabling location access may affect certain location-based BiteJoy features.</p>

  <h2>16. Special Category Information</h2>
  <p>BiteJoy is not designed to collect sensitive personal information unnecessarily. Some dietary information voluntarily provided by users could potentially reveal information considered sensitive under applicable privacy laws.</p>
  <p>Users should avoid providing sensitive information that is not necessary to receive BiteJoy's services. Where BiteJoy knowingly processes information requiring additional legal protection, we will apply an appropriate lawful condition where required.</p>

  <h2>17. Security</h2>
  <p>We use reasonable technical and organisational measures designed to protect personal information processed through BiteJoy. We also use established technology providers for parts of BiteJoy's infrastructure. However, no online service, database or electronic transmission method can guarantee absolute security.</p>
  <p>If we become aware of a personal data breach, we will assess and respond to it in accordance with applicable data protection law. Where legally required, affected individuals and/or the relevant supervisory authority will be notified.</p>

  <h2>18. Children's Privacy</h2>
  <p>BiteJoy is not directed at children under 13. We do not knowingly seek to collect personal information from children under 13. If we become aware that personal information belonging to a child under 13 has been collected inappropriately, we will take reasonable steps to remove it.</p>
  <p>Users in jurisdictions with a higher applicable minimum age for consent to online services should only use BiteJoy where permitted under applicable law or with any required parental or guardian authorisation.</p>

  <h2>19. Cookies and Similar Technologies</h2>
  <p>BiteJoy's website or third-party services used by BiteJoy may use cookies or similar technologies necessary for functionality such as:</p>
  <ul><li>Authentication</li><li>Security</li><li>Maintaining user sessions</li><li>Remembering preferences</li><li>Operating website functionality</li></ul>
  <p>Where applicable law requires consent for non-essential cookies or similar technologies, BiteJoy will seek to obtain the appropriate consent before using them. Additional information may be provided through a separate cookie notice as BiteJoy's website functionality develops.</p>

  <h2>20. Account and Data Deletion</h2>
  <p>Users may request deletion of their BiteJoy account and associated personal information. To request deletion, contact: <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a>. Please state that you are requesting deletion of your BiteJoy account or personal information.</p>
  <p>We may need to retain limited information where required by law, for security purposes, or for the establishment, exercise or defence of legal claims.</p>

  <h2>21. Complaints</h2>
  <p>If you have concerns about how BiteJoy handles your personal information, please contact us first at: <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a>.</p>
  <p>If UK data protection law applies and you remain dissatisfied, you also have the right to make a complaint to the <strong>Information Commissioner's Office (ICO)</strong>, the UK's data protection supervisory authority.</p>
  <p>You may also have the right to complain to an appropriate data protection or privacy authority in the country where you live.</p>

  <h2>22. Changes to This Privacy Policy</h2>
  <p>We may update this Privacy Policy as BiteJoy develops, our technology providers change, new functionality is introduced or legal requirements change. The current version will be published on BiteJoy's website. The "Last updated" date at the top of this policy identifies when it was most recently revised.</p>

  <h2>23. Contact</h2>
  <p>For privacy questions, data protection requests, account deletion requests or concerns about BiteJoy's handling of personal information, contact:</p>
  <div class="card">
    <p style="margin:0;"><strong>BiteJoy</strong></p>
    <p style="margin:4px 0 0;">Email: <a href="mailto:mega_671@hotmail.co.uk">mega_671@hotmail.co.uk</a></p>
    <p style="margin:4px 0 0; color:#6b5f55;">Operator: BiteJoy is currently operated by an individual in the United Kingdom.</p>
  </div>
</main>
</body>
</html>`;
