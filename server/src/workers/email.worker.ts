import { Worker } from "bullmq";
import  config  from "../config/config.js";
import  logger  from "../lib/logger.js";
import  sendEmail  from "../services/email.service.js";

import forgotPasswordEmailTemplate from "../template/forgotPasswordEmailTemplate.js";
import emailVerificationTemplate from "../template/emailVerification.template.js";

const emailWorker = new Worker(
  "email",
  async (job) => {
    logger.info(`Processing job: ${job.name}`);

    if (job.name === "verification-email") {
      const { email, username, verificationToken } = job.data;
      const html = emailVerificationTemplate({
        username,
        emailVerificationToken: verificationToken,
      });

      await sendEmail(
        email,
        "[AI-BATTLE-ARENA] Verify your email address",
        html
      );
    }

    if (job.name === "password-reset-email") {
      const { email, username, resetUrl } = job.data;
      const html = forgotPasswordEmailTemplate({
        username,
        resetUrl,
      });

      await sendEmail(
        email,
        "[AI-BATTLE-ARENA] Reset your password",
        html
      );
    }

  },
  {
    connection: {
     url:config.REDIS_URL
    },
  }
);


emailWorker.on("ready", () => {
  logger.info("Worker is ready for background messages and jobs");
});

emailWorker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, error) => {
  logger.error({
    jobId: job?.id,
    error: error.message,
  }, "Job failed");
});

emailWorker.on("error", (err) => {
  logger.error({ err }, "BullMQ Worker connection error");
});


export default emailWorker;