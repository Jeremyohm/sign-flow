export async function onRequest(context) {
  const { env, request } = context;

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  return Response.json({
    POSTMARK_API_TOKEN_present: !!env.POSTMARK_API_TOKEN,
    POSTMARK_API_TOKEN_length: env.POSTMARK_API_TOKEN?.length || 0,
    POSTMARK_API_TOKEN_first4: env.POSTMARK_API_TOKEN?.substring(0, 4) || null,
    POSTMARK_FROM_EMAIL: env.POSTMARK_FROM_EMAIL || null,
    POSTMARK_SERVER_TOKEN_present: !!env.POSTMARK_SERVER_TOKEN,
    CRON_SECRET_present: !!env.CRON_SECRET,
    VITE_SUPABASE_URL_present: !!env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_KEY_present: !!env.SUPABASE_SERVICE_KEY,
    SF_WEBHOOK_SHARED_SECRET_present: !!env.SF_WEBHOOK_SHARED_SECRET,
    all_env_keys: Object.keys(env).sort(),
  });
}
