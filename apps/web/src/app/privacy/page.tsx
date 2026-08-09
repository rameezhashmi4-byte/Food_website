import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const CONTACT_EMAIL = "mega_671@hotmail.co.uk";

function ContactLink({ label }: { label?: string }) {
  return (
    <a className="text-accent hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
      {label ?? CONTACT_EMAIL}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16 sm:gap-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: 10 August 2026</p>
      </div>

      <section id="about-bitejoy" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">1. About BiteJoy</h2>
        <p className="leading-relaxed">
          BiteJoy is a food discovery and recommendation service that helps users discover restaurants, hidden gems
          and places to eat based on factors such as their location, searches and food preferences.
        </p>
        <p className="leading-relaxed">
          BiteJoy may be available through its website, applications, ChatGPT integrations and other supported
          services.
        </p>
        <p className="leading-relaxed">BiteJoy is currently operated by an individual based in the United Kingdom.</p>
        <p className="leading-relaxed">
          For the purposes of applicable UK data protection law, including the UK General Data Protection Regulation
          (&ldquo;UK GDPR&rdquo;) and the Data Protection Act 2018, the operator of BiteJoy is the{" "}
          <strong>data controller</strong> for personal information where BiteJoy determines how and why that
          information is processed.
        </p>
        <p>
          <strong>Privacy contact:</strong> <ContactLink />
        </p>
      </section>

      <section id="information-we-collect" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">2. Information We Collect</h2>
        <p className="leading-relaxed">
          Depending on how you use BiteJoy, we may collect and process the following categories of personal
          information.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Account and Profile Information</h3>
        <p className="leading-relaxed">This may include:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your name</li>
          <li>Email address</li>
          <li>Account identifier</li>
          <li>Profile information</li>
          <li>Authentication information</li>
          <li>Account preferences</li>
        </ul>

        <h3 className="mt-3 text-base font-semibold text-text">Food and Dining Preferences</h3>
        <p className="leading-relaxed">This may include information you choose to provide about:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Preferred cuisines</li>
          <li>Dietary preferences</li>
          <li>Food preferences</li>
          <li>Restaurant preferences</li>
          <li>Saved restaurants</li>
          <li>Favourite or saved places</li>
          <li>Dining preferences</li>
        </ul>
        <p className="leading-relaxed">
          We use this information primarily to personalise BiteJoy and provide more relevant recommendations.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Location Information</h3>
        <p className="leading-relaxed">
          BiteJoy may process your location or an area that you provide when you use location-based features. This
          may include information used to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Find restaurants near you</li>
          <li>Find nearby hidden gems</li>
          <li>Provide local recommendations</li>
          <li>Determine relevant places in a particular area</li>
          <li>Provide maps or directions</li>
          <li>Improve the relevance of search results</li>
        </ul>
        <p className="leading-relaxed">
          Where supported, you may be able to enter a location manually instead of providing device location
          information.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Search and Usage Information</h3>
        <p className="leading-relaxed">We may process information about how you use BiteJoy, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Restaurant searches</li>
          <li>Food-related searches and queries</li>
          <li>Locations searched</li>
          <li>Recommendations viewed</li>
          <li>Restaurants or places saved</li>
          <li>Interactions with BiteJoy features</li>
        </ul>

        <h3 className="mt-3 text-base font-semibold text-text">Technical Information</h3>
        <p className="leading-relaxed">
          When you access BiteJoy online, limited technical information may also be processed by BiteJoy or its
          service providers. This may include information such as device or browser information, IP address,
          security information, logs and information necessary to operate and protect the service.
        </p>
      </section>

      <section id="how-we-use-your-information" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">3. How We Use Your Information</h2>
        <p className="leading-relaxed">We may use personal information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide BiteJoy&rsquo;s food discovery service</li>
          <li>Generate personalised restaurant recommendations</li>
          <li>Find restaurants and places relevant to your location</li>
          <li>Remember your preferences</li>
          <li>Save restaurants and places to your account</li>
          <li>Create and manage user accounts</li>
          <li>Authenticate users</li>
          <li>Provide maps, places and location functionality</li>
          <li>Respond to user requests</li>
          <li>Maintain and improve BiteJoy</li>
          <li>Diagnose technical problems</li>
          <li>Maintain the security and integrity of the service</li>
          <li>Prevent fraud, abuse and misuse</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
        <p className="leading-relaxed">
          BiteJoy does <strong>not sell your personal information</strong>.
        </p>
      </section>

      <section id="lawful-bases" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">4. Our Lawful Bases Under UK GDPR</h2>
        <p className="leading-relaxed">
          Where UK GDPR applies, BiteJoy must have a lawful basis for processing personal information. Depending on
          the processing activity, we may rely on the following lawful bases.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Contract</h3>
        <p className="leading-relaxed">
          We may process information where it is necessary to provide BiteJoy functionality that you request. For
          example:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Creating and managing your account</li>
          <li>Saving restaurants</li>
          <li>Remembering your account preferences</li>
          <li>Processing a restaurant search</li>
          <li>Providing requested personalised recommendations</li>
        </ul>

        <h3 className="mt-3 text-base font-semibold text-text">Legitimate Interests</h3>
        <p className="leading-relaxed">
          We may process certain information where necessary for BiteJoy&rsquo;s legitimate interests, provided
          those interests are not overridden by your rights and freedoms. These interests may include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Maintaining and improving BiteJoy</li>
          <li>Understanding how the service is used</li>
          <li>Preventing fraud and abuse</li>
          <li>Maintaining service security</li>
          <li>Diagnosing technical problems</li>
          <li>Improving recommendation quality</li>
        </ul>
        <p className="leading-relaxed">
          Where required, we consider the impact of this processing on users before relying on legitimate interests.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Consent</h3>
        <p className="leading-relaxed">
          Where required by applicable law, we may ask for your consent before processing particular information or
          using certain technologies. Where processing relies on consent, you may withdraw that consent at any time.
          Withdrawal does not affect the lawfulness of processing carried out before consent was withdrawn.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Legal Obligation</h3>
        <p className="leading-relaxed">
          We may process information where necessary to comply with a legal obligation that applies to BiteJoy.
        </p>
      </section>

      <section id="personalised-recommendations" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">5. Personalised Recommendations</h2>
        <p className="leading-relaxed">
          One of BiteJoy&rsquo;s main purposes is to provide personalised food and restaurant recommendations.
          Recommendations may take into account information such as:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your food preferences</li>
          <li>Dietary preferences</li>
          <li>Saved restaurants</li>
          <li>Search history</li>
          <li>Location or requested search area</li>
          <li>Previous interactions with BiteJoy</li>
        </ul>
        <p className="leading-relaxed">
          BiteJoy may use automated systems to rank, filter or recommend restaurants and places. These
          recommendations are intended to assist food discovery. BiteJoy does not currently intend to use this
          automated recommendation process to make decisions that produce legal effects or similarly significant
          effects concerning users.
        </p>
      </section>

      <section id="supabase" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">6. Supabase</h2>
        <p className="leading-relaxed">
          BiteJoy uses <strong>Supabase</strong> to provide backend technology and infrastructure. Depending on the
          BiteJoy features you use, Supabase may process or store information relating to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>User authentication</li>
          <li>User accounts</li>
          <li>Profiles</li>
          <li>Food preferences</li>
          <li>Saved restaurants and places</li>
          <li>Application data</li>
          <li>Database records</li>
          <li>Security and technical information</li>
        </ul>
        <p className="leading-relaxed">
          Supabase processes information according to its applicable privacy, security and contractual arrangements.
        </p>
      </section>

      <section id="google-services" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">7. Google Services</h2>
        <p className="leading-relaxed">
          BiteJoy uses <strong>Google services</strong> to provide certain functionality. Depending on the features
          you use, Google services may assist BiteJoy with:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authentication</li>
          <li>Restaurant information</li>
          <li>Place information</li>
          <li>Location searches</li>
          <li>Maps</li>
          <li>Directions</li>
          <li>Food and restaurant discovery</li>
          <li>Related location functionality</li>
        </ul>
        <p className="leading-relaxed">
          Information necessary to provide these functions may be transmitted to and processed by Google.
          Google&rsquo;s processing of information is also subject to its applicable privacy policies and terms.
        </p>
      </section>

      <section id="openai-chatgpt" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">8. OpenAI and ChatGPT</h2>
        <p className="leading-relaxed">
          BiteJoy may be available through ChatGPT or other OpenAI services. When you choose to interact with
          BiteJoy through ChatGPT, information necessary to fulfil your request may be transmitted between ChatGPT
          and BiteJoy. Depending on the request, this may include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Restaurant searches</li>
          <li>Food-related queries</li>
          <li>Location or search-area information</li>
          <li>Food preferences</li>
          <li>Dietary preferences</li>
          <li>Restaurant preferences</li>
          <li>Requests to save or retrieve restaurants</li>
          <li>Other information necessary to provide the requested functionality</li>
        </ul>
        <p className="leading-relaxed">
          Your use of ChatGPT is also subject to OpenAI&rsquo;s applicable terms and privacy policies. BiteJoy only
          intends to request information reasonably necessary to provide its functionality.
        </p>
      </section>

      <section id="authentication" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">9. Authentication</h2>
        <p className="leading-relaxed">
          BiteJoy may support authentication using third-party providers, including Google or other supported login
          providers. When you use third-party authentication, BiteJoy may receive information required to identify
          and authenticate your account, such as your name, email address and account identifier. BiteJoy does not
          receive your third-party account password. Authentication information may be processed using Supabase.
        </p>
      </section>

      <section id="sharing-your-information" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">10. Sharing Your Information</h2>
        <p className="leading-relaxed">
          BiteJoy does not sell personal information. We may share or allow personal information to be processed by
          service providers where reasonably necessary to operate BiteJoy. These may include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> &mdash; database, authentication and backend infrastructure
          </li>
          <li>
            <strong>Google services</strong> &mdash; maps, places, location, authentication and related functionality
          </li>
          <li>
            <strong>OpenAI/ChatGPT</strong> &mdash; when BiteJoy is accessed through ChatGPT or relevant OpenAI
            functionality
          </li>
          <li>Hosting and technical infrastructure providers necessary to operate BiteJoy</li>
        </ul>
        <p className="leading-relaxed">
          We may also disclose information where required by law or where reasonably necessary to protect the
          rights, security or integrity of BiteJoy, its users or others.
        </p>
      </section>

      <section id="international-data-transfers" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">11. International Data Transfers</h2>
        <p className="leading-relaxed">
          BiteJoy is intended for users worldwide and uses technology providers that may operate infrastructure in
          multiple countries. As a result, personal information may be processed in countries other than the country
          where you live, including potentially outside the United Kingdom or European Economic Area.
        </p>
        <p className="leading-relaxed">
          Where UK data protection law requires safeguards for an international transfer, BiteJoy will seek to rely
          on an applicable lawful transfer mechanism or safeguards provided through its service providers. These may
          include applicable adequacy regulations, contractual protections or other legally recognised transfer
          mechanisms.
        </p>
      </section>

      <section id="how-long-we-keep-information" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">12. How Long We Keep Information</h2>
        <p className="leading-relaxed">
          BiteJoy does not intend to retain personal information for longer than reasonably necessary. Retention
          depends on why the information was collected. For example:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account information may be retained while your account remains active</li>
          <li>Preferences and saved restaurants may be retained while needed to provide your personalised account</li>
          <li>Search and usage information may be retained for a reasonable period to operate, secure and improve BiteJoy</li>
          <li>Security records and technical logs may be retained for a limited period for security, troubleshooting and fraud prevention</li>
          <li>Information may be retained for longer where required by law or necessary to establish, exercise or defend legal claims</li>
        </ul>
        <p className="leading-relaxed">
          When information is no longer required, we may delete or anonymise it where appropriate.
        </p>
      </section>

      <section id="your-uk-data-protection-rights" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">13. Your UK Data Protection Rights</h2>
        <p className="leading-relaxed">Where UK data protection law applies, you may have rights including:</p>

        <h3 className="mt-3 text-base font-semibold text-text">Right of Access</h3>
        <p className="leading-relaxed">You may request a copy of personal information BiteJoy holds about you.</p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Rectification</h3>
        <p className="leading-relaxed">You may ask us to correct inaccurate or incomplete personal information.</p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Erasure</h3>
        <p className="leading-relaxed">
          In certain circumstances, you may ask us to delete personal information concerning you.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Restriction</h3>
        <p className="leading-relaxed">
          In certain circumstances, you may ask us to restrict how your personal information is processed.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Data Portability</h3>
        <p className="leading-relaxed">
          Where applicable, you may request certain information you provided to BiteJoy in a structured, commonly
          used and machine-readable format.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Object</h3>
        <p className="leading-relaxed">
          Where processing is based on legitimate interests, you may have the right to object to that processing.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Right to Withdraw Consent</h3>
        <p className="leading-relaxed">
          Where processing relies upon your consent, you may withdraw that consent at any time.
        </p>

        <h3 className="mt-3 text-base font-semibold text-text">Rights Relating to Automated Decision-Making</h3>
        <p className="leading-relaxed">
          Where applicable, you may have rights relating to decisions made solely using automated processing that
          produce legal or similarly significant effects.
        </p>

        <p className="mt-3 leading-relaxed">
          To exercise a privacy right, contact: <ContactLink />
        </p>
        <p className="leading-relaxed">
          We may need to verify your identity before fulfilling certain requests. Requests will be handled within
          the time periods required by applicable data protection law.
        </p>
      </section>

      <section id="rights-outside-uk" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">14. Rights of Users Outside the United Kingdom</h2>
        <p className="leading-relaxed">
          BiteJoy is intended to be accessible to users worldwide. Depending on where you live, you may have
          additional privacy rights under your local laws. Where applicable, BiteJoy will seek to honour legally
          required rights concerning access, correction, deletion or other control over your personal information.
        </p>
        <p className="leading-relaxed">
          You can submit privacy requests to: <ContactLink />
        </p>
      </section>

      <section id="location-privacy" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">15. Location Privacy</h2>
        <p className="leading-relaxed">
          Location information is used to provide relevant restaurant and food discovery functionality. BiteJoy does
          not sell your location information to advertisers.
        </p>
        <p className="leading-relaxed">
          Where available, you may provide a location manually rather than allowing access to your device location.
          You can also use your device or browser settings to control location permissions. Disabling location
          access may affect certain location-based BiteJoy features.
        </p>
      </section>

      <section id="special-category-information" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">16. Special Category Information</h2>
        <p className="leading-relaxed">
          BiteJoy is not designed to collect sensitive personal information unnecessarily. Some dietary information
          voluntarily provided by users could potentially reveal information considered sensitive under applicable
          privacy laws.
        </p>
        <p className="leading-relaxed">
          Users should avoid providing sensitive information that is not necessary to receive BiteJoy&rsquo;s
          services. Where BiteJoy knowingly processes information requiring additional legal protection, we will
          apply an appropriate lawful condition where required.
        </p>
      </section>

      <section id="security" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">17. Security</h2>
        <p className="leading-relaxed">
          We use reasonable technical and organisational measures designed to protect personal information
          processed through BiteJoy. We also use established technology providers for parts of BiteJoy&rsquo;s
          infrastructure. However, no online service, database or electronic transmission method can guarantee
          absolute security.
        </p>
        <p className="leading-relaxed">
          If we become aware of a personal data breach, we will assess and respond to it in accordance with
          applicable data protection law. Where legally required, affected individuals and/or the relevant
          supervisory authority will be notified.
        </p>
      </section>

      <section id="childrens-privacy" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">18. Children&rsquo;s Privacy</h2>
        <p className="leading-relaxed">
          BiteJoy is not directed at children under 13. We do not knowingly seek to collect personal information
          from children under 13. If we become aware that personal information belonging to a child under 13 has
          been collected inappropriately, we will take reasonable steps to remove it.
        </p>
        <p className="leading-relaxed">
          Users in jurisdictions with a higher applicable minimum age for consent to online services should only use
          BiteJoy where permitted under applicable law or with any required parental or guardian authorisation.
        </p>
      </section>

      <section id="cookies" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">19. Cookies and Similar Technologies</h2>
        <p className="leading-relaxed">
          BiteJoy&rsquo;s website or third-party services used by BiteJoy may use cookies or similar technologies
          necessary for functionality such as:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authentication</li>
          <li>Security</li>
          <li>Maintaining user sessions</li>
          <li>Remembering preferences</li>
          <li>Operating website functionality</li>
        </ul>
        <p className="leading-relaxed">
          Where applicable law requires consent for non-essential cookies or similar technologies, BiteJoy will seek
          to obtain the appropriate consent before using them. Additional information may be provided through a
          separate cookie notice as BiteJoy&rsquo;s website functionality develops.
        </p>
      </section>

      <section id="account-and-data-deletion" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">20. Account and Data Deletion</h2>
        <p className="leading-relaxed">
          Users may request deletion of their BiteJoy account and associated personal information. To request
          deletion, contact: <ContactLink />. Please state that you are requesting deletion of your BiteJoy account
          or personal information.
        </p>
        <p className="leading-relaxed">
          We may need to retain limited information where required by law, for security purposes, or for the
          establishment, exercise or defence of legal claims.
        </p>
      </section>

      <section id="complaints" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">21. Complaints</h2>
        <p className="leading-relaxed">
          If you have concerns about how BiteJoy handles your personal information, please contact us first at:{" "}
          <ContactLink />.
        </p>
        <p className="leading-relaxed">
          If UK data protection law applies and you remain dissatisfied, you also have the right to make a complaint
          to the <strong>Information Commissioner&rsquo;s Office (ICO)</strong>, the UK&rsquo;s data protection
          supervisory authority.
        </p>
        <p className="leading-relaxed">
          You may also have the right to complain to an appropriate data protection or privacy authority in the
          country where you live.
        </p>
      </section>

      <section id="changes-to-this-privacy-policy" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">22. Changes to This Privacy Policy</h2>
        <p className="leading-relaxed">
          We may update this Privacy Policy as BiteJoy develops, our technology providers change, new functionality
          is introduced or legal requirements change. The current version will be published on BiteJoy&rsquo;s
          website. The &ldquo;Last updated&rdquo; date at the top of this policy identifies when it was most
          recently revised.
        </p>
      </section>

      <section id="contact" className="flex flex-col gap-3 text-text">
        <h2 className="text-xl font-bold tracking-tight text-text">23. Contact</h2>
        <p className="leading-relaxed">
          For privacy questions, data protection requests, account deletion requests or concerns about
          BiteJoy&rsquo;s handling of personal information, contact:
        </p>
        <div className="rounded-bj border border-border bg-surface p-5">
          <p className="font-semibold text-text">BiteJoy</p>
          <p className="mt-1">
            Email: <ContactLink />
          </p>
          <p className="mt-1 text-muted">Operator: BiteJoy is currently operated by an individual in the United Kingdom.</p>
        </div>
      </section>
    </div>
  );
}
