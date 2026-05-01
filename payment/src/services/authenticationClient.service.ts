import { getEnvOrThrow } from "../config/env.js";

export interface UserContact {
  userId: string;
  email?: string;
  phone?: string;
}

export async function getUserContactById(userId: string): Promise<UserContact | null> {
  const env = getEnvOrThrow();
  if (!env.INTERNAL_API_KEY) {
    throw new Error("INTERNAL_API_KEY is required to call authentication internal APIs");
  }

  const baseUrl = env.AUTHENTICATION_SERVICE_URL.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/internal/users/${encodeURIComponent(userId)}` , {
    method: "GET",
    headers: {
      "x-internal-api-key": env.INTERNAL_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth service ${res.status}: ${text || res.statusText}`);
  }

  const body = (await res.json()) as { user: UserContact };
  return body.user;
}
