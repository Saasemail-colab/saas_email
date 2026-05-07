import { Activity, ArrowRight, CheckCircle2, Inbox, KeyRound, MailPlus, ShieldCheck } from "lucide-react";
import { getServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";

const metrics = [
  { label: "Emails envoyes", value: "12 840", tone: "blue" },
  { label: "Livraison", value: "98.2%", tone: "green" },
  { label: "Bounces", value: "1.1%", tone: "amber" },
  { label: "Plaintes", value: "0.04%", tone: "red" }
];

const modules = [
  {
    icon: ShieldCheck,
    title: "Expediteurs verifies",
    text: "Domaines, alias et adresses valides par DNS avant l'envoi."
  },
  {
    icon: MailPlus,
    title: "API d'envoi",
    text: "Endpoint unique pour envoyer depuis un expediteur autorise."
  },
  {
    icon: Inbox,
    title: "Inbox entrante",
    text: "Reception via webhooks provider et conversations centralisees."
  },
  {
    icon: Activity,
    title: "Delivrabilite",
    text: "Suivi des statuts, bounces, plaintes, ouvertures et clics."
  }
];

export default async function HomePage() {
  let domains: Array<{ domain: string; status: string }> | null = null;

  if (hasSupabaseServerEnv()) {
    const supabase = getServerSupabase();
    const response = await supabase
      .from("domains")
      .select("domain,status")
      .order("created_at", { ascending: false })
      .limit(4);

    domains = response.data;
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
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Plateforme email multi-tenant</p>
            <h1>Envoyer, recevoir et piloter les emails depuis des expediteurs verifies.</h1>
          </div>
          <a className="primaryButton" href="#send">
            Nouveau message
            <ArrowRight size={16} />
          </a>
        </header>

        <section id="dashboard" className="metricGrid" aria-label="Indicateurs">
          {metrics.map((metric) => (
            <article className="metric" data-tone={metric.tone} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="contentGrid">
          <article id="send" className="panel wide">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Composer</p>
                <h2>Envoi controle</h2>
              </div>
              <CheckCircle2 size={20} />
            </div>
            <form className="composeForm">
              <label>
                Expediteur verifie
                <input value="support@votre-domaine.com" readOnly />
              </label>
              <label>
                Destinataire
                <input placeholder="client@example.com" />
              </label>
              <label>
                Sujet
                <input placeholder="Bienvenue sur notre plateforme" />
              </label>
              <label className="full">
                Message
                <textarea placeholder="Bonjour, votre compte est pret..." rows={6} />
              </label>
              <button type="button">Envoyer le test</button>
            </form>
          </article>

          <article id="domains" className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">DNS</p>
                <h2>Domaines</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="domainList">
              {(domains?.length ? domains : [{ domain: "exemple.com", status: "pending" }]).map((domain) => (
                <div className="domainRow" key={domain.domain}>
                  <span>{domain.domain}</span>
                  <strong>{domain.status}</strong>
                </div>
              ))}
            </div>
          </article>

          <article id="api" className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Developpeurs</p>
                <h2>API</h2>
              </div>
              <KeyRound size={20} />
            </div>
            <pre className="codeBlock">{`POST /api/email/send
{
  "organizationId": "uuid-organisation",
  "provider": "resend",
  "from": "support@domaine.com",
  "to": "client@example.com",
  "subject": "Bonjour",
  "html": "<p>Message</p>"
}`}</pre>
          </article>
        </section>

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
      </section>
    </main>
  );
}
