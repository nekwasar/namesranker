import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "namesranker.session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  sub: string;
  email: string;
  plan: "FREE" | "PREMIUM";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET must be set to a value of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      plan: payload.plan as SessionPayload["plan"],
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = cookies();

  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
