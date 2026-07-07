import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "nexora_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function adminUser() {
  return process.env.ADMIN_USER || "root";
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || (adminPassword() ? `nexora-admin-session:${adminPassword()}` : "");
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function adminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export function verifyAdminCredentials(user: string, password: string) {
  const expectedUser = process.env.ADMIN_USER || "root";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";

  return Boolean(expectedPassword) && safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
}

export function createAdminSessionToken(user: string) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isAdminSessionToken(token?: string) {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user?: string; exp?: number };
    return session.user === adminUser() && typeof session.exp === "number" && session.exp > Date.now();
  } catch {
    return false;
  }
}

function hasBasicAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");

  if (separator === -1) return false;

  return verifyAdminCredentials(decoded.slice(0, separator), decoded.slice(separator + 1));
}

export function isAdmin(request: NextRequest) {
  return isAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value) || hasBasicAuth(request);
}

export function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
