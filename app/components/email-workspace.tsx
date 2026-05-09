"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type InboundMessageRow = {
  id: string;
  from_email: string;
  to_email: string;
  subject: string | null;
  html_body: string | null;
  text_body: string | null;
  received_at: string;
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
  "resend"
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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [audience, setAudience] = useState<"transactional" | "marketing">("transactional");
  const [senders, setSenders] = useState(initialSenders);
  const [domains, setDomains] = useState(initialDomains);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [inboundMessages, setInboundMessages] = useState<InboundMessageRow[]>([]);
  const [status, setStatus] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState<"register" | "send" | "load" | "setup" | "diagnostics" | "inbox" | null>(null);
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

  function syncEditorContent() {
    const content = editorRef.current?.innerHTML ?? "";
    const plainText = editorRef.current?.innerText ?? "";
    setHtml(content.trim() ? content : "<p></p>");
    setText(plainText.trim());
  }

  function runEditorCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  function insertTemplate(kind: "welcome" | "followup" | "simple") {
    const templates = {
      welcome: "<p>Bonjour,</p><p>Votre compte est pret. Vous pouvez maintenant utiliser la plateforme.</p><p>Cordialement,<br>Equipe support</p>",
      followup: "<p>Bonjour,</p><p>Nous revenons vers vous concernant votre demande.</p><p>Merci pour votre confiance.</p>",
      simple: "<p>Bonjour,</p><p>Votre message ici.</p><p>Cordialement,</p>"
    };
    const nextHtml = templates[kind];
    setHtml(nextHtml);
    setText(stripHtml(nextHtml));
    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }
  }
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
          id: organizationId.trim(),
          name: organizationName.trim()
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

  async function loadInbox(nextOrganizationId = organizationId) {
    setLoadingAction("inbox");
    setStatus({ tone: "info", text: "Chargement de la boite de reception..." });

    try {
      const response = await fetch(`/api/inbound/messages?organizationId=${encodeURIComponent(nextOrganizationId)}`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger la boite de reception.");
      }

      setInboundMessages(data.messages ?? []);
      setStatus({ tone: "success", text: "Boite de reception chargee." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant le chargement de la boite de reception."
      });
    } finally {
      setLoadingAction(null);
    }
  }
  async function setupSupabaseSchema() {
    setLoadingAction("setup");
    setStatus({ tone: "info", text: "Installation des tables Supabase..." });

    try {
      const response = await fetch("/api/setup/supabase", {
        method: "POST"
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        const detail = data.detail ? ` Detail: ${data.detail}` : "";
        throw new Error(`${data.error ?? "Impossible d'installer les tables Supabase."}${detail}`);
      }

      setStatus({
        tone: "success",
        text: data.message ?? "Base Supabase installee."
      });
      loadOrganizations();
      loadSenders();
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant l'installation Supabase."
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function runSupabaseDiagnostics() {
    setLoadingAction("diagnostics");
    setStatus({ tone: "info", text: "Diagnostic Supabase..." });

    try {
      const response = await fetch("/api/setup/diagnostics");
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Diagnostic Supabase impossible.");
      }

      const summary = (data.checks ?? [])
        .map((check: { name: string; ok: boolean; message: string; detail?: string }) => {
          const detail = check.detail ? ` (${check.detail})` : "";
          return `${check.ok ? "OK" : "ERREUR"} ${check.name}: ${check.message}${detail}`;
        })
        .join(" | ");

      setStatus({
        tone: data.ok ? "success" : "error",
        text: summary || "Diagnostic termine."
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Erreur pendant le diagnostic Supabase."
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
          organizationId: organizationId.trim(),
          provider,
          email: from.trim().toLowerCase(),
          displayName: displayName.trim() || undefined,
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
          organizationId: organizationId.trim(),
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
          organizationId: organizationId.trim(),
          provider,
          from: from.trim().toLowerCase(),
          to: to.split(",").map((recipient: string) => recipient.trim()).filter(Boolean),
          subject,
          html,
          text,
          audience,
          replyTo: from.trim().toLowerCase()
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
          <button type="button" className="secondaryButton" onClick={setupSupabaseSchema} disabled={loadingAction !== null}>
            {loadingAction === "setup" ? "Installation..." : "Installer base Supabase"}
          </button>
          <button type="button" className="secondaryButton" onClick={runSupabaseDiagnostics} disabled={loadingAction !== null}>
            {loadingAction === "diagnostics" ? "Diagnostic..." : "Diagnostiquer Supabase"}
          </button>
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
          <div className="editorShell full">
            <div className="editorTopline">
              <div>
                <span className="fieldLabel">Message</span>
                <strong>Editeur visuel</strong>
              </div>
              <div className="templateGroup" aria-label="Modeles rapides">
                <button type="button" className="chipButton" onClick={() => insertTemplate("welcome")}>Bienvenue</button>
                <button type="button" className="chipButton" onClick={() => insertTemplate("followup")}>Relance</button>
                <button type="button" className="chipButton" onClick={() => insertTemplate("simple")}>Simple</button>
              </div>
            </div>
            <div className="editorToolbar" aria-label="Outils de mise en forme">
              <button type="button" className="toolButton" title="Gras" onClick={() => runEditorCommand("bold")}>B</button>
              <button type="button" className="toolButton italicTool" title="Italique" onClick={() => runEditorCommand("italic")}>I</button>
              <button type="button" className="toolButton" title="Liste" onClick={() => runEditorCommand("insertUnorderedList")}>Liste</button>
              <button type="button" className="toolButton" title="Titre" onClick={() => runEditorCommand("formatBlock", "h2")}>Titre</button>
              <button type="button" className="toolButton" title="Paragraphe" onClick={() => runEditorCommand("formatBlock", "p")}>Texte</button>
              <button type="button" className="toolButton" title="Lien" onClick={() => {
                const url = window.prompt("URL du lien");
                if (url) runEditorCommand("createLink", url);
              }}>Lien</button>
            </div>
            <div
              ref={editorRef}
              className="visualEditor"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Message email"
              onInput={syncEditorContent}
              onBlur={syncEditorContent}
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="editorMeta">
              <span>{text.length} caracteres texte</span>
              <span>HTML genere automatiquement</span>
            </div>
          </div>

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
                loadInbox(organization.id);
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

      <article id="inbox" className="panel inboxPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Inbox SaaS</p>
            <h2>Reponses recues</h2>
          </div>
          <button className="iconButton" type="button" onClick={() => loadInbox()} disabled={loadingAction !== null}>
            {loadingAction === "inbox" ? "Chargement..." : "Recharger"}
          </button>
        </div>
        <div className="inboxHint">
          Les reponses arrivent ici quand <strong>INBOUND_REPLY_TO_EMAIL</strong> pointe vers une adresse entrante reliee au webhook.
        </div>
        <div className="inboxList">
          {inboundMessages.length ? (
            inboundMessages.map((message) => (
              <article className="inboxItem" key={message.id}>
                <div className="inboxItemHeader">
                  <strong>{message.subject ?? "Sans sujet"}</strong>
                  <span>{new Date(message.received_at).toLocaleString()}</span>
                </div>
                <div className="inboxAddresses">
                  <span>De: {message.from_email}</span>
                  <span>A: {message.to_email}</span>
                </div>
                <p>{message.text_body || stripHtml(message.html_body ?? "") || "Message sans contenu texte."}</p>
              </article>
            ))
          ) : (
            <div className="emptyInbox">
              Aucune reponse pour cette organisation. Configure le webhook entrant puis clique sur Recharger.
            </div>
          )}
        </div>
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
function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
