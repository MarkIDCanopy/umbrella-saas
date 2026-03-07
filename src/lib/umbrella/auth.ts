// src/lib/umbrella/auth.ts
import "server-only";

type Cached = { token: string; expiresAt: number };

// Cache PER authUrl (important if you have sandbox + live)
const tokenCache = new Map<string, Cached>();

export async function getUmbrellaAccessToken(opts?: { sandbox?: boolean }) {
  const apiKey = process.env.UMBRELLA_API_KEY;
  const customerId = process.env.UMBRELLA_CUSTOMER_ID;

  if (!apiKey || !customerId) {
    throw new Error("Missing UMBRELLA_API_KEY or UMBRELLA_CUSTOMER_ID");
  }

  // decide sandbox vs live: prefer explicit flag, otherwise non-production -> sandbox
  const useSandbox =
    typeof opts?.sandbox === "boolean"
      ? opts.sandbox
      : process.env.NODE_ENV !== "production";

  const authUrl = useSandbox
    ? process.env.UMBRELLA_AUTH_URL_SANDBOX || process.env.UMBRELLA_AUTH_URL
    : process.env.UMBRELLA_AUTH_URL || process.env.UMBRELLA_AUTH_URL_SANDBOX;

  if (!authUrl) {
    throw new Error(
      "Umbrella auth URL not configured. Set UMBRELLA_AUTH_URL or UMBRELLA_AUTH_URL_SANDBOX in .env"
    );
  }

  const now = Date.now();
  const cached = tokenCache.get(authUrl);
  if (cached && cached.expiresAt > now + 10_000) {
    return cached.token;
  }

  const authRes = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Api-Key": apiKey,
      "Customer-Id": customerId,
    },
    body: "", // keep if provider accepts empty form body
    cache: "no-store",
  });

  const authText = await authRes.text().catch(() => "");

  if (!authRes.ok) {
    throw new Error(`Umbrella Auth Error (${authRes.status}): ${authText}`);
  }

  let json: any = null;
  try {
    json = authText ? JSON.parse(authText) : null;
  } catch {
    json = null;
  }

  const token = json?.access_token;
  if (!token) {
    throw new Error(`Umbrella Auth Error: missing access_token. Body: ${authText}`);
  }

  const expiresInMs = (Number(json?.expires_in) || 3600) * 1000;

  tokenCache.set(authUrl, {
    token,
    expiresAt: now + expiresInMs,
  });

  return token;
}