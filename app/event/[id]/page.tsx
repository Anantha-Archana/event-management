"use client";
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./detail.css";
type Ev={_id:string;title:string;description:string;startsAt:string;timeZone:string;venue:string;capacity:number;activeCount:number;organizerName:string};
export default function EventDetail({params}:{params:Promise<{id:string}>}){
 const router=useRouter();
 const [event,setEvent]=useState<Ev|null>(null),[error,setError]=useState(""),[message,setMessage]=useState(""),[user,setUser]=useState<{role:string}|null>(null);
 useEffect(()=>{params.then(async({id})=>{try{const [r,me]=await Promise.all([fetch(`/api/events/${id}`),fetch("/api/me")]);const d=await r.json();if(!r.ok)throw Error(d.error);setEvent(d.event);if(me.ok)setUser((await me.json()).user)}catch(e){setError(e instanceof Error?e.message:"Could not load this event.")}})},[params]);
 const date=event?new Intl.DateTimeFormat("en-US",{dateStyle:"full",timeStyle:"short",timeZone:event.timeZone}).format(new Date(event.startsAt)):"";
 async function register(){if(!user){router.push("/");return}const r=await fetch(`/api/events/${event?._id}`,{method:"POST"}),d=await r.json();setMessage(r.ok?"You’re on the list!":"");if(!r.ok)setError(d.error);else setError("")}
 if(error&&!event)return <main className="dashboard"><a href="/">← Back to events</a><div className="empty"><h3>{error}</h3><a className="button button-dark" href="/">Explore events</a></div></main>;
 if(!event)return <main className="dashboard"><p className="state">Loading event…</p></main>;
 return <main><nav className="nav"><a href="/" className="brand"><span className="brand-mark">g</span> gather<span className="brand-dot">.</span></a><div className="nav-right"><a className="nav-link" href="/#events">Discover</a><a className="button button-dark" href="/dashboard">My dashboard ↗</a></div></nav><section className="dashboard"><a className="nav-link" href="/#events">← All events</a><div className="detail-layout"><div><p className="eyebrow">A GATHERING BY {event.organizerName.toUpperCase()}</p><h1 className="detail-title">{event.title}</h1><p className="detail-copy">{event.description}</p><div className="detail-facts"><div><span>WHEN</span><strong>{date}</strong><small>{event.timeZone}</small></div><div><span>WHERE</span><strong>{event.venue}</strong></div></div></div><aside className="detail-card"><div className="detail-symbol">✳</div><p className="eyebrow">SAVE YOURSELF A SEAT</p><h2>{Math.max(event.capacity-event.activeCount,0)} <span>places left</span></h2><p className="muted">{event.activeCount} of {event.capacity} spots are spoken for.</p><button className="button button-dark full" onClick={register} disabled={event.activeCount>=event.capacity}>{user?.role==="organizer"?"Organizer account":"Register for this event"}<span>↗</span></button>{message&&<p className="success">{message}</p>}{error&&<p className="error">{error}</p>}<p className="detail-note">No payment required. Cancel anytime from your attendee dashboard.</p></aside></div></section></main>
}
