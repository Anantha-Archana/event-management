import { NextResponse } from "next/server";
import db from "@/lib/db";
import { Event, Registration } from "@/lib/models";
import { currentUser } from "@/lib/auth";
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) { const user = await currentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 }); if (user.role !== "organizer") return NextResponse.json({ error: "Organizer access required." }, { status: 403 }); await db(); const { id } = await ctx.params; const event = await Event.findById(id).lean(); if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 }); if (event.organizerId !== user.id) return NextResponse.json({ error: "You do not own this event." }, { status: 403 }); const attendees = await Registration.find({ eventId: id, canceledAt: null }).sort({ registeredAt: 1 }).select("attendeeName attendeeEmail registeredAt").lean(); return NextResponse.json({ attendees }); }
