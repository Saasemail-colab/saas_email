import { Activity, ArrowRight, Inbox, MailPlus, ShieldCheck } from "lucide-react";
import { EmailWorkspace } from "@/app/components/email-workspace";
import { getServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";

const metrics = [
  { label: "Emails envoyes", value: "12 840", tone: "blue" },
  { label: "Livraison", value: "98.2%", tone: "green" },
  { label: "Bounces", value: "1.1%", tone: "amber" },
  { label: "Plaintes", value: "0.04%", tone: "red" }
];

const modules = [
  { icon: ShieldCheck, title: "Expediteurs verifies", text: "Domaines, alias et adresses valides avant l'envoi." },
  { icon: MailPlus, title: "API d'envoi", text: "Endpoint unique pour envoyer depuis un expediteur autorise." },
  { icon: Inbox, title: "Inbox entrante", text: "Reception via webhooks provider et conversations centralisees." },
  { icon: Activity, title: "Delivrabilite", text: "Suivi des statuts, bounces, plaintes, ouvertures et clics." }
];

export default async function HomePage() {
  let domains: Array<{ domain: string; status: string }> | null = null;
  let senders: Array<{ id: string; email: string; display_name: string | null; status: string }> | null = null;
  let organizations: Array<{ id: string; name: string; plan: string; status: string }> | null = null;

  if (hasSupabaseServerEnv()) {
    try {
      const supabase = getServerSupabase();
      const [domainResponse, senderResponse, organizationResponse] = await Promise.all([
        supabase.from("domains").select("domain,status").order("created_at", { ascending: false }).limit(6),
        supabase.from("sender_identities").select("id,email,display_name,status").order("created_at", { ascending: false }).limit(8),
        supabase.from("organizations").select("id,name,plan,status").order("created_at", { ascending: false }).limit(10)
      ]);

      domains = domainResponse.data;
      senders = senderResponse.data;
      organizations = organizationResponse.data;
    } catch {
      domains = null;
      senders = null;
      organizations = null;
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">E</div>
          <div>
            <strong>EmailOps</strong>
            <span>Mail SaaS</span>
          </div>
        </div>
        <nav className="nav">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#send">Envoi</a>
          <a href="#domains">Domaines</a>
          <a href="#inbox">Inbox</a>
          <a href="#api">API</a>
          <a href="/confidentialite">Confidentialite</a>
          <a href="/utilisation">Utilisation</a>
          <a href="/conditions">Conditions</a>
          <a href="/suppression-donnees">Suppression donnees</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme email multi-tenant</p>
            <h1>Envoyer, recevoir et piloter les emails depuis des expediteurs verifies.</h1>
          </div>
          <div className="topbarActions">
            <a className="secondaryButton" href="/confidentialite">Confidentialite</a>
            <a className="secondaryButton" href="/utilisation">Utilisation acceptable</a>
            <a className="primaryButton" href="/admin-login?next=/#send">
              Acces admin
              <ArrowRight size={16} />
            </a>
          </div>
        </header>

        <section id="dashboard" className="metricGrid" aria-label="Indicateurs">
          {metrics.map((metric) => (
            <article className="metric" data-tone={metric.tone} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <EmailWorkspace
          initialDomains={domains?.length ? domains : [{ domain: "exemple.com", status: "pending" }]}
          initialOrganizations={
            organizations?.length
              ? organizations
              : [{ id: "00000000-0000-0000-0000-000000000001", name: "Organisation EmailOps", plan: "starter", status: "active" }]
          }
          initialSenders={
            senders?.length
              ? senders
              : [{ id: "demo-sender", email: "support@votre-domaine.com", display_name: "Support", status: "pending" }]
          }
        />

        <section id="inbox" className="moduleGrid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article className="module" key={module.title}>
                <Icon size={20} />
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            );
          })}
        </section>
        <footer className="publicFooter">
          <span>EmailOps</span>
          <a href="/confidentialite">Politique de confidentialite</a>
          <a href="/utilisation">Politique d&apos;utilisation</a>
          <a href="/conditions">Conditions</a>
          <a href="/suppression-donnees">Suppression des donnees</a>
          <a href="/google-api-disclosure">Usage des donnees Google</a>
        </footer>
      </section>
    </main>
  );
}
