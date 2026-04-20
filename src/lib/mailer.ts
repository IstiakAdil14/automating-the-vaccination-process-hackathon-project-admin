import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? "smtp.sendgrid.net",
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? "apikey",
    pass: process.env.SMTP_PASS ?? process.env.SENDGRID_API_KEY ?? "",
  },
});

export async function sendEmail({
  to, subject, template,
}: {
  to:       string;
  subject:  string;
  template: ReactElement;
}) {
  const html = await render(template);
  await transporter.sendMail({
    from:    `"VaxAdmin" <${process.env.SMTP_FROM ?? "noreply@vax.gov.bd"}>`,
    to,
    subject,
    html,
  });
}
