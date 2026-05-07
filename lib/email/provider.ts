import { Resend } from "resend";
import nodemailer from "nodemailer";

export const EMAIL_PROVIDER_NAMES = [
  "resend",
  "smtp",
  "sendgrid",
  "mailgun",
  "postmark",
  "brevo",
  "mailersend"
] as const;

export type EmailProviderName =
  (typeof EMAIL_PROVIDER_NAMES)[number];

export type SendEmailInput = {
  provider?: EmailProviderName;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  provider: EmailProviderName;
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

  if (config.name === "resend") {
    return sendWithResend(input);
  }

  if (config.name === "smtp") {
    return sendWithSmtp(input);
  }

  if (config.name === "sendgrid") {
    return sendWithSendGrid(input);
  }

  if (config.name === "mailgun") {
    return sendWithMailgun(input);
  }

  if (config.name === "postmark") {
    return sendWithPostmark(input);
  }

  if (config.name === "brevo") {
    return sendWithBrevo(input);
  }

  return sendWithMailerSend(input);
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

async function sendWithSendGrid(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is missing.");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: input.to.map((email) => ({ email }))
        }
      ],
      from: { email: input.from },
      reply_to: input.replyTo ? { email: input.replyTo } : undefined,
      subject: input.subject,
      content: [
        input.text ? { type: "text/plain", value: input.text } : undefined,
        { type: "text/html", value: input.html }
      ].filter(Boolean),
      headers: input.headers
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${errorText}`);
  }

  return {
    provider: "sendgrid",
    providerMessageId: response.headers.get("x-message-id") ?? undefined
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

async function sendWithPostmark(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.POSTMARK_SERVER_TOKEN;

  if (!apiKey) {
    throw new Error("POSTMARK_SERVER_TOKEN is missing.");
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      From: input.from,
      To: input.to.join(","),
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      ReplyTo: input.replyTo,
      Headers: Object.entries(input.headers ?? {}).map(([Name, Value]) => ({ Name, Value }))
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Postmark error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { MessageID?: string };

  return {
    provider: "postmark",
    providerMessageId: data.MessageID
  };
}

async function sendWithBrevo(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender: { email: input.from },
      to: input.to.map((email) => ({ email })),
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      replyTo: input.replyTo ? { email: input.replyTo } : undefined,
      headers: input.headers
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { messageId?: string };

  return {
    provider: "brevo",
    providerMessageId: data.messageId
  };
}

async function sendWithMailerSend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.MAILERSEND_API_KEY;

  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      from: { email: input.from },
      to: input.to.map((email) => ({ email })),
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo ? { email: input.replyTo } : undefined,
      headers: Object.entries(input.headers ?? {}).map(([name, value]) => ({ name, value }))
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MailerSend error ${response.status}: ${errorText}`);
  }

  return {
    provider: "mailersend",
    providerMessageId: response.headers.get("x-message-id") ?? undefined
  };
}
