import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

/**
 * The BullMQ worker is never started in tests: `bullmq` is replaced by a stub that only
 * records the processor so we can call it directly with fake jobs. The Resend client is
 * mocked as well, so no real e-mail can ever be sent.
 */
const captured = vi.hoisted(() => ({
  queueName: undefined as string | undefined,
  processor: undefined as ((job: any) => Promise<void>) | undefined,
  options: undefined as any,
  handlers: {} as Record<string, (...args: any[]) => void>,
}));

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Worker: class {
    constructor(name: string, processor: (job: any) => Promise<void>, options: unknown) {
      captured.queueName = name;
      captured.processor = processor;
      captured.options = options;
    }
    on(event: string, handler: (...args: any[]) => void) {
      captured.handlers[event] = handler;
      return this;
    }
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

import sendEmailMock from "../../src/services/email.service.js";
import logger from "../../src/lib/logger.js";
import { NEVER_CONNECT_REDIS_URL } from "../helpers/testEnv";

const sendEmail = sendEmailMock as unknown as ReturnType<typeof vi.fn>;

beforeAll(async () => {
  await import("../../src/workers/email.worker.js");
});

beforeEach(() => {
  sendEmail.mockReset();
  resendSend.mockReset();
});

describe("email worker (processor logic only - no Redis, no real e-mail)", () => {
  it("listens on the 'email' queue (same name the controllers enqueue to)", () => {
    expect(captured.queueName).toBe("email");
    expect(captured.options.connection.url).toBe(NEVER_CONNECT_REDIS_URL);
  });

  it("verification-email: sends the verification e-mail to the user with the token in the link", async () => {
    await captured.processor!({
      name: "verification-email",
      data: { email: "new@example.com", username: "new_user", verificationToken: "TOKEN123" },
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = sendEmail.mock.calls[0]!;
    expect(to).toBe("new@example.com");
    expect(subject).toBe("[AI-BATTLE-ARENA] Verify your email address");
    expect(html).toContain("TOKEN123");
    expect(html).toContain("new_user");
  });

  it("password-reset-email: sends the reset e-mail containing the reset URL", async () => {
    await captured.processor!({
      name: "password-reset-email",
      data: { email: "forgot@example.com", username: "forgetful", resetUrl: "http://frontend.test/reset-password?token=ABC" },
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = sendEmail.mock.calls[0]!;
    expect(to).toBe("forgot@example.com");
    expect(subject).toBe("[AI-BATTLE-ARENA] Reset your password");
    expect(html).toContain("http://frontend.test/reset-password?token=ABC");
  });

  it("ignores unknown job names", async () => {
    await expect(captured.processor!({ name: "something-else", data: {} })).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects (so BullMQ can retry) when the e-mail sender throws", async () => {
    sendEmail.mockRejectedValueOnce(new Error("provider down"));

    await expect(
      captured.processor!({
        name: "verification-email",
        data: { email: "a@example.com", username: "abc", verificationToken: "t" },
      }),
    ).rejects.toThrow("provider down");
  });

  it("logs when the worker is ready for jobs", () => {
    const info = vi.spyOn(logger, "info");

    captured.handlers.ready!();

    expect(info).toHaveBeenCalledWith("Worker is ready for background messages and jobs");
  });

  it("logs failed jobs and connection errors without throwing", () => {
    const error = vi.spyOn(logger, "error");

    captured.handlers.failed!({ id: "1" }, new Error("boom"));
    captured.handlers.failed!(undefined, new Error("stalled"));
    captured.handlers.error!(new Error("redis connection lost"));

    expect(error).toHaveBeenCalledTimes(3);
  });
});

describe("email service (real implementation, Resend mocked)", () => {
  const loadActual = async () =>
    (await vi.importActual<typeof import("../../src/services/email.service.js")>("../../src/services/email.service.js")).default;

  it("sends through Resend with the expected sender, recipient, subject and html", async () => {
    resendSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null });
    const send = await loadActual();

    const result = await send("to@example.com", "Hello", "<p>hi</p>");

    expect(result).toEqual({ id: "email_1" });
    expect(resendSend).toHaveBeenCalledWith({
      from: "ARENA BATTLE AI <noreply@techy.fun>",
      to: ["to@example.com"],
      subject: "Hello",
      html: "<p>hi</p>",
    });
  });

  it("[FINDING] provider errors are swallowed (returns null) so the worker job 'succeeds' and BullMQ never retries", async () => {
    resendSend.mockResolvedValueOnce({ data: null, error: { message: "rate limited" } });
    const send = await loadActual();

    await expect(send("to@example.com", "Hello", "<p>hi</p>")).resolves.toBeNull();
  });

  it("[FINDING] thrown network errors are swallowed too", async () => {
    resendSend.mockRejectedValueOnce(new Error("ECONNRESET"));
    const send = await loadActual();

    await expect(send("to@example.com", "Hello", "<p>hi</p>")).resolves.toBeNull();
  });
});
