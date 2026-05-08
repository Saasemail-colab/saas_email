import { Resend } from "resend";
import nodemailer from "nodemailer";

export const EMAIL_PROVIDER_NAMES = [
  "auto",
  "gmail_smtp",
  "gmail_oauth",
  "resend",
  "smtp",
  "mailgun"
] as const;

export type EmailProviderName =
  (typeof EMAIL_PROVIDER_NAMES)[number];

export type ConcreteEmailProviderName = Exclude<EmailProviderName, "auto">;

export type SendEmailInput = {
  provider?: EmailProviderName;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  gmailOAuth?: {
    refreshToken: string;
    email: string;
  };
};

export type SendEmailResult = {
  provider: ConcreteEmailProviderName;
  providerMessageId?: string;
};

type ProviderConfig = {
  name: EmailProviderName;
};

export function getEmailProviderName(): EmailProviderName {
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  if (isEmailProviderName(provider)) {
    return provider;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export function isEmailProviderName(provider: string): provider is EmailProviderName {
  return EMAIL_PROVIDER_NAMES.includes(provider as EmailProviderName);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config: ProviderConfig = {
    name: input.provider ?? getEmailProviderName()
  };

  if (config.name === "auto") {
    return sendWithFirstAvailableProvider(input);
  }

  if (config.name === "resend") {
    return sendWithResend(input);
  }

  if (config.name === "gmail_smtp") {
    return sendWithGmailSmtp(input);
  }

  if (config.name === "smtp") {
    return sendWithSmtp(input);
  }

  if (config.name === "mailgun") {
    return sendWithMailgun(input);
  }

  if (config.name === "gmail_oauth") {
    return sendWithGmailOAuth(input);
  }

  throw new Error(`Unsupported email provider: ${config.name}`);
}

export function getAvailableProviders(): ConcreteEmailProviderName[] {
  const providers: ConcreteEmailProviderName[] = [];

  if (process.env.RESEND_API_KEY) {
    providers.push("resend");
  }

  if (process.env.GMAIL_SMTP_USER && process.env.GMAIL_SMTP_PASS) {
    providers.push("gmail_smtp");
  }

  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    providers.push("mailgun");
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CREDENTIAL_ENCRYPTION_KEY) {
    providers.push("gmail_oauth");
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    providers.push("smtp");
  }

  return providers;
}

async function sendWithFirstAvailableProvider(input: SendEmailInput): Promise<SendEmailResult> {
  const providers = getAvailableProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    if (provider === "gmail_oauth" && !input.gmailOAuth) {
      continue;
    }

    try {
      return await sendEmail({ ...input, provider });
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  throw new Error(
    errors.length
      ? `No email provider succeeded. ${errors.join(" | ")}`
      : "No email provider is configured. Add at least one provider API key on Render."
  );
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.replyTo,
    headers: input.headers
  } as Parameters<typeof resend.emails.send>[0]);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    provider: "resend",
    providerMessageId: result.data?.id
  };
}

async function sendWithSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS are required for SMTP provider.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    headers: input.headers
  });

  return {
    provider: "smtp",
    providerMessageId: info.messageId
  };
}

async function sendWithGmailSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_PASS;

  if (!user || !pass) {
    throw new Error("GMAIL_SMTP_USER and GMAIL_SMTP_PASS are required for Gmail SMTP.");
  }

  if (input.from.toLowerCase() !== user.toLowerCase()) {
    throw new Error("Gmail SMTP can only send from the configured GMAIL_SMTP_USER address.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user,
      pass
    }
  });

  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    headers: input.headers
  });

  return {
    provider: "gmail_smtp",
    providerMessageId: info.messageId
  };
}

async function sendWithMailgun(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const baseUrl = process.env.MAILGUN_BASE_URL ?? "https://api.mailgun.net";

  if (!apiKey || !domain) {
    throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN are required for Mailgun provider.");
  }

  const formData = new FormData();
  formData.set("from", input.from);
  input.to.forEach((recipient) => formData.append("to", recipient));
  formData.set("subject", input.subject);
  formData.set("html", input.html);

  if (input.text) {
    formData.set("text", input.text);
  }

  if (input.replyTo) {
    formData.set("h:Reply-To", input.replyTo);
  }

  for (const [key, value] of Object.entries(input.headers ?? {})) {
    formData.set(`h:${key}`, value);
  }

  const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { id?: string };

  return {
    provider: "mailgun",
    providerMessageId: data.id
  };
}

async function sendWithGmailOAuth(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.gmailOAuth) {
    throw new Error("Gmail OAuth credentials are required for this sender.");
  }

  const accessToken = await refreshGoogleAccessToken(input.gmailOAuth.refreshToken);
  const raw = buildRawEmail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    headers: input.headers
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { id?: string };

  return {
    provider: "gmail_oauth",
    providerMessageId: data.id
  };
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Gmail OAuth.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const data = (await response.json()) as { access_token?: string; error_description?: string; error?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Unable to refresh Google access token.");
  }

  return data.access_token;
}

function buildRawEmail(input: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const boundary = `emailops_${Date.now().toString(36)}`;
  const headers = [
    ["From", input.from],
    ["To", input.to.join(", ")],
    ["Subject", encodeHeader(input.subject)],
    ["MIME-Version", "1.0"],
    ["Reply-To", input.replyTo],
    ...Object.entries(input.headers ?? {}),
    ["Content-Type", `multipart/alternative; boundary="${boundary}"`]
  ]
    .filter((header): header is [string, string] => Boolean(header[1]))
    .map(([key, value]) => `${key}: ${sanitizeHeader(value)}`)
    .join("\r\n");

  const textPart = input.text ?? stripHtml(input.html);
  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textPart,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    `--${boundary}--`
  ].join("\r\n");

  return Buffer.from(`${headers}\r\n\r\n${body}`, "utf8").toString("base64url");
}

function encodeHeader(value: string) {
  return /^[\x00-\x7F]*$/.test(value)
    ? sanitizeHeader(value)
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
