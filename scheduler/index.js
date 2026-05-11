// Sign Flow scheduler — fires Pages cron endpoints on schedule.
// Cloudflare Pages doesn't support cron triggers, so this minimal Worker
// exists solely to fan out HTTP calls to the Pages cron endpoints.

const PAGES_BASE_URL = "https://sign-flow.net";

const ENDPOINTS = {
  EVERY_MINUTE: [
    "/api/cron/process-email-outbox",
    "/api/cron/process-pdf-generation",
  ],
  EVERY_FIVE_MINUTES: [
    "/api/cron/process-webhook-retries",
  ],
};

async function callEndpoint(path, secret) {
  try {
    const res = await fetch(`${PAGES_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[${path}] failed status=${res.status} body=${body.slice(0, 500)}`);
    } else {
      console.log(`[${path}] ok`);
    }
  } catch (err) {
    console.error(`[${path}] threw: ${err.message}`);
  }
}

export default {
  async scheduled(event, env, ctx) {
    if (!env.CRON_SECRET) {
      console.error("CRON_SECRET not set on scheduler worker");
      return;
    }

    const endpoints = event.cron === "*/5 * * * *"
      ? ENDPOINTS.EVERY_FIVE_MINUTES
      : ENDPOINTS.EVERY_MINUTE;

    const tasks = endpoints.map(path => callEndpoint(path, env.CRON_SECRET));
    ctx.waitUntil(Promise.all(tasks));
  },

  async fetch() {
    return new Response("Sign Flow scheduler is running. Cron triggers fire automatically.", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
