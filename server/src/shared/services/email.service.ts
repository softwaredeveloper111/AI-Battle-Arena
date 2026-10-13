import { Resend } from "resend";
import config from "../../config/config.js";
import logger from "../../lib/logger.js";

const resend = new Resend(config.RESEND_API_KEY);

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "ARENA BATTLE AI <noreply@techy.fun>",
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    });

    if (error) {
      logger.error({ error }, "Error sending email❌:");
      return null;
    }

    logger.info({ id: data?.id }, "Email sent successfully✅");

    return data;
  } catch (error) {
    logger.error({error},"Error sending email❌:");
    return null;
  }
};

export   { sendEmail };

