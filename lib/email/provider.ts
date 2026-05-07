import { Resend } from "resend";
import nodemailer from "nodemailer";

export type EmailProviderName = "resend" | "smtp" | "sendgrid";

export type SendEmailInput = {
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

  if (provider === "smtp" || provider === "sendgrid" || provider === "resend") {
    return provider;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config: ProviderConfig = {
    name: getEmailProviderName()
  };

  if (config.name === "resend") {
    return sendWithResend(input);
  }

  if (config.name === "smtp") {
    return sendWithSmtp(input);
  }

  return sendWithSendGrid(input);
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
  });

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
