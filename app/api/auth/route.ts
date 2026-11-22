import { NextResponse } from "next/server";
import { authenticate, sign } from "@/lib/auth";
export async function POST(req: Request) { const { email, password } = await req.json(); const user = authenticate(String(email || ""), String(password || "")); if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 }); const res = NextResponse.json({ user }); res.cookies.set("event_session", sign(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 }); return res; }
export async function DELETE() { const res = NextResponse.json({ ok: true }); res.cookies.delete("event_session"); return res; }
