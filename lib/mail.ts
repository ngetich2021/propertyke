import "server-only";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // Nodemailer's default timeouts run into minutes. If outbound SMTP is
  // blocked or slow, a mutation that sends a notification email must not
  // hang the user-facing action waiting on it -- fail fast instead.
  connectionTimeout: 8_000,
  greetingTimeout: 8_000,
  socketTimeout: 8_000,
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    await transporter.sendMail({
      from: `"Lands & Properties" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    // Best-effort: a failed notification email should never break the mutation it's attached to.
    console.error("sendMail failed", error);
  }
}
