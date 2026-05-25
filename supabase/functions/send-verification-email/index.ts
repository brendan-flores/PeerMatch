/** Minimal Deno types for Supabase Edge runtime (ignored by Next.js via .vercelignore). */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "PeerMatch <onboarding@resend.dev>";
const TTL_MINUTES = Deno.env.get("VERIFICATION_CODE_TTL_MINUTES") ?? "10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        message: "RESEND_API_KEY is not set in Supabase Edge Function secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const to = String(body?.to ?? "").trim();
    const name = String(body?.name ?? "User").trim() || "User";
    const code = String(body?.code ?? "").trim();

    if (!to || !code) {
      return new Response(JSON.stringify({ message: "to and code are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: "Peer Match System: Verify Your Email",
        text: `Hello ${name},\n\nYour Peer Match verification code is: ${code}\nThis code expires in ${TTL_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`,
        html: `<p>Hello ${name},</p><p>Your Peer Match verification code is: <strong>${code}</strong></p><p>This code expires in ${TTL_MINUTES} minutes.</p><p>If you do not request this, please ignore this email.</p>`,
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        typeof payload?.message === "string"
          ? payload.message
          : JSON.stringify(payload);
      return new Response(JSON.stringify({ message: `Resend error: ${detail}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ delivered: true, id: payload?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
