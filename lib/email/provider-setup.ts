import { EMAIL_PROVIDER_NAMES, type EmailProviderName } from "@/lib/email/provider";

export type ProviderSetupResult = {
  provider: EmailProviderName;
  status: "created" | "manual" | "skipped";
  message: string;
  records?: Array<{
    type: string;
    name: string;
    value: string;
    priority?: number;
  }>;
  raw?: unknown;
};

export async function setupSenderDomain(provider: EmailProviderName, domain: string): Promise<ProviderSetupResult> {
  if (!EMAIL_PROVIDER_NAMES.includes(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  if (provider === "resend") {
    return setupResendDomain(domain);
  }

  if (provider === "mailgun") {
    return setupMailgunDomain(domain);
  }

  return {
    provider,
    status: "manual",
    message:
      "Ce provider demande une verification dans son dashboard ou via une configuration specifique. Le domaine a ete enregistre en pending dans Supabase."
  };
}

async function setupResendDomain(domain: string): Promise<ProviderSetupResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      provider: "resend",
      status: "skipped",
      message: "RESEND_API_KEY manquant. Ajoute la cle sur Render puis relance l'ajout."
    };
  }

  const response = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: domain })
  });

  const data = await safeJson(response);

  if (!response.ok && response.status !== 409) {
    throw new Error(`Resend domain setup failed ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    provider: "resend",
    status: response.status === 409 ? "manual" : "created",
    message:
      response.status === 409
        ? "Le domaine existe deja chez Resend. Verifie ses DNS dans le dashboard Resend."
        : "Domaine cree chez Resend. Copie les DNS fournis par Resend puis verifie le domaine.",
    raw: data
  };
}

async function setupMailgunDomain(domain: string): Promise<ProviderSetupResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const baseUrl = process.env.MAILGUN_BASE_URL ?? "https://api.mailgun.net";

  if (!apiKey) {
    return {
      provider: "mailgun",
      status: "skipped",
      message: "MAILGUN_API_KEY manquant. Ajoute la cle sur Render puis relance l'ajout."
    };
  }

  const formData = new FormData();
  formData.set("name", domain);

  const response = await fetch(`${baseUrl}/v4/domains`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`
    },
    body: formData
  });

  const data = await safeJson(response);

  if (!response.ok && response.status !== 409) {
    throw new Error(`Mailgun domain setup failed ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    provider: "mailgun",
    status: response.status === 409 ? "manual" : "created",
    message:
      response.status === 409
        ? "Le domaine existe deja chez Mailgun. Verifie ses DNS dans le dashboard Mailgun."
        : "Domaine cree chez Mailgun. Copie les DNS fournis par Mailgun puis verifie le domaine.",
    raw: data
  };
}

async function safeJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

