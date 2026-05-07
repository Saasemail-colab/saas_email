"use client";

import { useMemo, useState } from "react";

type DomainRow = {
  domain: string;
  status: string;
};

type SenderRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
};

type ProviderStatus = {
  provider: string;
  configured: boolean;
  note: string;
};

const providers = ["auto", "resend", "smtp", "sendgrid", "mailgun", "postmark", "brevo", "mailersend"] as const;

const defaultOrganizationId =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

export function EmailWorkspace({
  initialDomains,
  initialSenders
}: {
  initialDomains: DomainRow[];
  initialSenders: SenderRow[];
}) {
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [provider, setProvider] = useState<(typeof providers)[number]>("auto");
  const [from, setFrom] = useState(initialSenders[0]?.email ?? "support@votre-domaine.com");
  const [displayName, setDisplayName] = useState(initialSenders[0]?.display_name ?? "Support");
  const [to, setTo] = useState("client@example.com");
  const [subject, setSubject] = useState("Bienvenue sur notre plateforme");
  const [html, setHtml] = useState("<p>Bonjour, votre compte est pret.</p>");
  const [text, setText] = useState("Bonjour, votre compte est pret.");
  const [audience, setAudience] = useState<"transactional" | "marketing">("transactional");
  const [senders, setSenders] = useState(initialSenders);
  const [domains, setDomains] = useState(initialDomains);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState<"register" | "send" | "load" | null>(null);

  const selectedSender = useMemo(
    () => senders.find((sender) => sender.email.toLowerCase() === from.toLowerCase()),
    [from, senders]
  );

  async function loadSenders(nextOrganizationId = organizationId) {
    setLoadingAction("load");
    setStatus({ tone: "info", text: "Chargement des expediteurs..." });

    try {
      const response = await fetch(`/api/senders/register?organizationId=${encodeURIComponent(nextOrganizationId)}`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les expediteurs.");
      }

      setSenders(data.senders ?? []);
      setStatus({ tone: "success", text: "Expediteurs charges." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant le chargement."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function detectProviders() {
    setLoadingAction("load");
    setStatus({ tone: "info", text: "Detection des providers configures..." });

    try {
      const response = await fetch("/api/providers/status");
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de detecter les providers.");
      }

      setProviderStatuses(data.providers ?? []);
      const available = data.available?.length ? data.available.join(", ") : "aucun";
      setStatus({ tone: data.available?.length ? "success" : "error", text: `Providers disponibles: ${available}` });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant la detection."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function registerSender() {
    setLoadingAction("register");
    setStatus({ tone: "info", text: "Enregistrement de l'expediteur..." });

    try {
      const response = await fetch("/api/senders/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          provider,
          email: from,
          displayName,
          configureProvider: true
        })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer cet expediteur.");
      }

      setSenders((current) => {
        const withoutCurrent = current.filter((sender) => sender.email !== data.sender.email);
        return [data.sender, ...withoutCurrent];
      });
      setDomains((current) => {
        const withoutCurrent = current.filter((domain) => domain.domain !== data.domain.domain);
        return [data.domain, ...withoutCurrent];
      });
      setStatus({
        tone: "success",
        text: data.providerSetup?.message
          ? `Expediteur ajoute. ${data.providerSetup.message}`
          : "Expediteur ajoute en attente. Verifie le domaine chez ton provider avant l'envoi."
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant l'enregistrement."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function markSenderVerified() {
    setLoadingAction("register");
    setStatus({ tone: "info", text: "Verification locale de l'expediteur..." });

    try {
      const response = await fetch("/api/senders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          email: from
        })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de verifier cet expediteur.");
      }

      setSenders((current) => {
        const withoutCurrent = current.filter((sender) => sender.email !== data.sender.email);
        return [data.sender, ...withoutCurrent];
      });
      setDomains((current) => {
        const withoutCurrent = current.filter((domain) => domain.domain !== data.domain.domain);
        return [data.domain, ...withoutCurrent];
      });
      setStatus({
        tone: "success",
        text: "Expediteur marque verified dans Supabase. Tu peux lancer un envoi test."
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant la verification."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function sendMessage() {
    setLoadingAction("send");
    setStatus({ tone: "info", text: "Envoi du message..." });

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          provider,
          from,
          to: to.split(",").map((recipient) => recipient.trim()).filter(Boolean),
          subject,
          html,
          text,
          audience,
          replyTo: from
        })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "L'envoi a echoue.");
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text
    };
  }
}

      setStatus({
        tone: "success",
        text: `Email envoye via ${data.provider}. ID: ${data.providerMessageId ?? data.messageId}`
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant l'envoi."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className="contentGrid">
      <article id="send" className="panel wide">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Composer</p>
            <h2>Envoi controle</h2>
          </div>
          <span className="statusPill">{selectedSender?.status ?? "non enregistre"}</span>
        </div>

        <form className="composeForm" onSubmit={(event) => event.preventDefault()}>
          <label>
            Organisation
            <input
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              onBlur={() => loadSenders()}
            />
          </label>
          <label>
            Provider
            <select value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)}>
              {providers.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expediteur
            <input
              list="sender-options"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="support@votre-domaine.com"
            />
            <datalist id="sender-options">
              {senders.map((sender) => (
                <option value={sender.email} key={sender.id} />
              ))}
            </datalist>
          </label>
          <label>
            Nom affiche
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            Destinataire(s)
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="client@example.com" />
          </label>
          <label>
            Type
            <select value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}>
              <option value="transactional">transactional</option>
              <option value="marketing">marketing</option>
            </select>
          </label>
          <label className="full">
            Sujet
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label className="full">
            HTML
            <textarea value={html} onChange={(event) => setHtml(event.target.value)} rows={5} />
          </label>
          <label className="full">
            Texte simple
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} />
          </label>

          <div className="buttonRow full">
            <button type="button" className="secondaryButton" onClick={registerSender} disabled={loadingAction !== null}>
              {loadingAction === "register" ? "Enregistrement..." : "Ajouter l'expediteur"}
            </button>
            <button type="button" className="secondaryButton" onClick={markSenderVerified} disabled={loadingAction !== null}>
              Marquer verified
            </button>
            <button type="button" onClick={sendMessage} disabled={loadingAction !== null}>
              {loadingAction === "send" ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </form>

        {status ? <div className="formStatus" data-tone={status.tone}>{status.text}</div> : null}
      </article>

      <article id="domains" className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">DNS</p>
            <h2>Domaines</h2>
          </div>
          <button className="iconButton" type="button" onClick={() => loadSenders()} disabled={loadingAction !== null}>
            Recharger
          </button>
        </div>
        <div className="domainList">
          {(domains.length ? domains : [{ domain: "exemple.com", status: "pending" }]).map((domain) => (
            <div className="domainRow" key={domain.domain}>
              <span>{domain.domain}</span>
              <strong>{domain.status}</strong>
            </div>
          ))}
        </div>
        <button className="secondaryButton fullWidthButton" type="button" onClick={detectProviders} disabled={loadingAction !== null}>
          Detecter providers
        </button>
        {providerStatuses.length ? (
          <div className="providerList">
            {providerStatuses.map((item) => (
              <div className="providerRow" key={item.provider}>
                <span>{item.provider}</span>
                <strong data-configured={item.configured}>{item.configured ? "pret" : "manquant"}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article id="api" className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Developpeurs</p>
            <h2>API</h2>
          </div>
        </div>
        <pre className="codeBlock">{`POST /api/email/send
{
  "organizationId": "${organizationId}",
  "provider": "${provider}",
  "from": "${from}",
  "to": "${to}",
  "subject": "${subject}",
  "html": "${html.replaceAll('"', '\\"')}"
}`}</pre>
      </article>
    </section>
  );
}
