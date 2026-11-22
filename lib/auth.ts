import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export type User = { id: string; name: string; email: string; role: "organizer" | "attendee" };
const accounts: Record<string, User & { password: string }> = {
  "organizer@demo.test": { id: "organizer-1", name: "Alex Morgan", email: "organizer@demo.test", role: "organizer", password: "organizer123" },
  "attendee@demo.test": { id: "attendee-1", name: "Jamie Lee", email: "attendee@demo.test", role: "attendee", password: "attendee123" },
  "attendee2@demo.test": { id: "attendee-2", name: "Taylor Chen", email: "attendee2@demo.test", role: "attendee", password: "attendee234" },
};
function secret() { return process.env.SESSION_SECRET || "local-demo-secret-change-me"; }
export function authenticate(email: string, password: string) { const u = accounts[email.toLowerCase()]; return u?.password === password ? { id: u.id, name: u.name, email: u.email, role: u.role } : null; }
export function sign(user: User) { const payload = Buffer.from(JSON.stringify(user)).toString("base64url"); return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`; }
export function verify(value: string): User | null { try { const [p, s] = value.split("."); const expected = createHmac("sha256", secret()).update(p).digest(); const actual = Buffer.from(s, "base64url"); if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null; const u = JSON.parse(Buffer.from(p, "base64url").toString()) as User; return ["organizer", "attendee"].includes(u.role) ? u : null; } catch { return null; } }
export async function currentUser() { return verify((await cookies()).get("event_session")?.value || ""); }
