"use client";

import { useEffect, useMemo, useState } from "react";

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
  catalog?: {
    label: string;
    envKeys: string[];
    senderSetup: string;
    dnsNotes: string[];
  };
};

type OrganizationRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
};

const providers = [
  "auto",
  "gmail_smtp",
  "gmail_oauth",
  "resend",
  "smtp",
  "mailgun"
] as const;

const defaultOrganizationId =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

export function EmailWorkspace({
  initialDomains,
  initialSenders,
  initialOrganizations
}: {
  initialDomains: DomainRow[];
  initialSenders: SenderRow[];
  initialOrganizations: OrganizationRow[];
}) {
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [organizationName, setOrganizationName] = useState("Organisation EmailOps");
  const [organizations, setOrganizations] = useState(initialOrganizations);
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
  const [adminSession, setAdminSession] = useState<"checking" | "locked" | "unlocked">("checking");
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  const selectedSender = useMemo(
    () => senders.find((sender) => sender.email.toLowerCase() === from.toLowerCase()),
    [from, senders]
  );

  useEffect(() => {
    async function checkAdminSession() {
      try {
        const response = await fetch("/api/admin/session");
        const data = await readJsonResponse(response);
        setAdminSession(data.authenticated ? "unlocked" : "locked");
      } catch {
        setAdminSession("locked");
      }
    }

    checkAdminSession();

    const url = new URL(window.location.href);
    const connectedEmail = url.searchParams.get("email");
    const gmailError = url.searchParams.get("gmail_error");

    if (url.searchParams.get("gmail") === "connected" && connectedEmail) {
      setProvider("gmail_oauth");
      setFrom(connectedEmail);
      setStatus({ tone: "success", text: `Gmail connecte: ${connectedEmail}` });
      return;
    }

    if (gmailError) {
      setStatus({ tone: "error", text: gmailError });
    }
  }, []);

  async function loginAdmin() {
    setAdminError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Code admin invalide.");
      }

      setAdminSession("unlocked");
      setAdminCode("");
      detectProviders();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Impossible d'ouvrir l'espace admin.");
    }
  }

  async function logoutAdmin() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminSession("locked");
  }

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

  async function loadOrganizations() {
    setLoadingAction("load");
    setStatus({ tone: "info", text: "Chargement des organisations..." });

    try {
      const response = await fetch("/api/organizations");
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les organisations.");
      }

      setOrganizations(data.organizations ?? []);
      setStatus({ tone: "success", text: "Organisations chargees." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant le chargement des organisations."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function saveOrganization() {
    setLoadingAction("register");
    setStatus({ tone: "info", text: "Enregistrement de l'organisation..." });

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: organizationId,
          name: organizationName
        })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer l'organisation.");
      }

      setOrganizations((current: OrganizationRow[]) => {
        const withoutCurrent = current.filter((organization) => organization.id !== data.organization.id);
        return [data.organization, ...withoutCurrent];
      });
      setStatus({ tone: "success", text: "Organisation enregistree." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant l'enregistrement de l'organisation."
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

      setSenders((current: SenderRow[]) => {
        const withoutCurrent = current.filter((sender) => sender.email !== data.sender.email);
        return [data.sender, ...withoutCurrent];
      });
      setDomains((current: DomainRow[]) => {
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

      setSenders((current: SenderRow[]) => {
        const withoutCurrent = current.filter((sender) => sender.email !== data.sender.email);
        return [data.sender, ...withoutCurrent];
      });
      setDomains((current: DomainRow[]) => {
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

  function connectGmail() {
    const url = new URL("/api/oauth/google/start", window.location.origin);
    url.searchParams.set("organizationId", organizationId);
    url.searchParams.set("returnTo", "/#send");
    window.location.href = url.toString();
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
          to: to.split(",").map((recipient: string) => recipient.trim()).filter(Boolean),
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

  if (adminSession !== "unlocked") {
    return (
      <section className="adminGate">
        <div className="adminGateCard">
          <div>
            <p className="eyebrow">Acces admin</p>
            <h2>{adminSession === "checking" ? "Verification..." : "Code requis"}</h2>
            <p>
              La console email est reservee a la personne qui possede le code admin.
            </p>
          </div>
          {adminSession === "locked" ? (
            <form
              className="adminGateForm"
              onSubmit={(event) => {
                event.preventDefault();
                loginAdmin();
              }}
            >
              <label>
                Code admin
                <input
                  type="password"
                  value={adminCode}
                  onChange={(event) => setAdminCode(event.target.value)}
                  placeholder="Entrez le code"
                />
              </label>
              <button type="submit">Entrer</button>
              {adminError ? <div className="formStatus" data-tone="error">{adminError}</div> : null}
            </form>
          ) : null}
        </div>
      </section>
    );
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
        <div className="adminToolbar">
          <button type="button" className="gmailButton" onClick={connectGmail} disabled={loadingAction !== null}>
            Connecter Gmail
          </button>
          <button type="button" className="secondaryButton" onClick={logoutAdmin}>
            Verrouiller
          </button>
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
            Nom organisation
            <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
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
            <button type="button" className="secondaryButton" onClick={saveOrganization} disabled={loadingAction !== null}>
              Enregistrer organisation
            </button>
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
          <div className="sectionLabel">Organisations</div>
          {(organizations.length
            ? organizations
            : [{ id: organizationId, name: "Organisation EmailOps", plan: "starter", status: "active" }]
          ).map((organization: OrganizationRow) => (
            <button
              className="orgRow"
              key={organization.id}
              type="button"
              onClick={() => {
                setOrganizationId(organization.id);
                setOrganizationName(organization.name);
                loadSenders(organization.id);
              }}
            >
              <span>{organization.name}</span>
              <strong>{organization.status}</strong>
            </button>
          ))}
          <button className="secondaryButton fullWidthButton" type="button" onClick={loadOrganizations} disabled={loadingAction !== null}>
            Charger organisations
          </button>
          <div className="sectionLabel">Domaines</div>
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
                <div>
                  <span>{item.catalog?.label ?? item.provider}</span>
                  <small>{item.catalog?.envKeys?.join(", ") ?? item.note}</small>
                </div>
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
