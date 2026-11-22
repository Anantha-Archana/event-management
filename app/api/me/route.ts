import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
export async function GET() { const user = await currentUser(); return user ? NextResponse.json({ user }) : NextResponse.json({ error: "Sign in required." }, { status: 401 }); }
