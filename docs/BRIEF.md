# BAR8 — Product Brief

The canonical specification for the club website. When code and this document
disagree, this document is right — or it needs updating deliberately.

---

## What this is

A premium, mobile-first website for an existing private automotive community
centered around Audi R8 owners, but open to members who own and drive other
interesting enthusiast cars.

This is **not** a commercial business, dealership, rental service, or generic
car club. It is a private community of interesting people who love driving.

The website should feel like the digital home of the club: understated,
exclusive, automotive, social, and alive. It should feel like a private digital
paddock — not a forum, Facebook group, LinkedIn clone, or ticketing platform.

The founding community already exists. We are building infrastructure around it.

**No monetization.** No dues, subscriptions, checkout flows, or pricing pages.

## Core loop

> Discover event → see who's going → RSVP → drive/attend → meet people →
> share photos → come back for the next event

The cars create the initial connection between people, but the community is
ultimately about the people and experiences.

## North Star

The site answers one emotional question every time a member opens it:

> **"What are we doing next?"**

Optimize for getting members off the website and onto the road. Not for screen
time.

---

## Brand direction

Combine: Audi Motorsport · Porsche enthusiast culture · contemporary private
members clubs · premium editorial automotive photography · understated European
motorsport design.

**Use:** black, charcoal, off-white, restrained neutrals · large automotive
photography · strong typography · generous negative space · subtle motion ·
minimal UI chrome · beautiful mobile layouts.

**Avoid:** fake carbon fiber · racing stripes · checkered flags · neon
gradients · supercar-lifestyle clichés · crypto/tech-startup aesthetics ·
excessive gold · generic luxury templates.

The club should feel cool because of restraint.

---

## Public website

Intentionally minimal. Create intrigue; do not explain every feature.

**Homepage hero** — full-screen automotive photography/video.

> Built to be driven.
>
> A private community built around great cars, great roads and the people
> behind the wheel.

Primary CTA: _Request to Join_. Secondary: _Explore the Club_.

**Community** — brief explanation. Began around Audi R8 owners; now includes
Porsche 911/GT, Ferrari, Lamborghini, McLaren, Mercedes-AMG, BMW M, Corvette,
Lotus, and vintage/unusual enthusiast cars. **No artificial eligibility
requirements based on price or brand.** Curated around people and enthusiasm.

**Experiences** — editorial presentation of five categories:

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| Morning Drives | Great roads, early starts, breakfast afterward.                        |
| Track          | Track days, driving experiences and motorsport.                        |
| Tables         | Small dinners and gatherings.                                          |
| Weekends       | Napa, Tahoe, Los Angeles, Monterey, Vegas and other destinations.      |
| Access         | Garages, collections, launches and interesting automotive experiences. |

**Past events** — editorial cards, e.g. _Skyline Morning Run · September 12,
2026 · 18 cars · 74 miles_. Clicking opens a recap/gallery.

**Request Membership** — fields: first name, last name, email, phone,
city/location, primary car, other cars, Instagram (optional), LinkedIn
(optional), referred by, "Tell us a little about yourself", optional car photo.

Submission does **not** create membership. Display _"Application received.
We'll be in touch."_ Admins approve manually.

---

## Authenticated member experience

The member homepage immediately answers: What's happening next? Who is going?
What did I miss? Who is in this community?

### Member dashboard

Greeting (_Good evening, Raza._), then the next event, prominently:

```
NEXT DRIVE
Skyline → Alice's → Half Moon Bay
Saturday, September 12
Meet 6:45 AM  ·  Depart 7:00 AM
18 attending  ·  7 spots remaining
[avatar row]
```

CTA is _View Event_; RSVP state shows _RSVP_ or _You're going ✓_.

Below: **Coming Up** (next 3–5 events as cards with image, name, date,
category, attending count, capacity, avatar stack), then **From the Last
Drive** (large editorial photography from the most recent event).

### Events

Filters: Upcoming · Drives · Track · Social · Dinners · Trips · Past.

**Event page** — hero photography, title, date, route summary, `21 / 25
attending`, avatar stack, then:

- **Schedule** — timeline (`6:45 AM — Meet`, `7:15 AM — Depart`, …)
- **Route** — map or visual route; start location, distance, estimated driving
  time, external navigation links
- **Who's Going** — _important._ Attending members with the car they're
  bringing; clickable to profiles
- **Cars Attending** — visual summary, e.g. `21 cars · 8 Audi R8 · 5 Porsche
911 · 2 Ferrari · 2 McLaren · 1 Lamborghini · 3 Other`
- **RSVP** — opens/embeds Luma

### Garage

Members add multiple cars. Each: year, manufacturer, model, trim, exterior
color, interior color (optional), modifications (optional), story, photos,
current/former designation. One car may be designated **Primary**. Members
select which car they're bringing to an event.

### Members

Private directory, authenticated only. Cards emphasize **human first, car
second**: avatar, name, city, role, primary car, small car image. Search and
filter by name, location, car manufacturer/model, interests. Professional
information is never mandatory.

### Member profile

Name, location, role, member-since, optional social links, optional bio,
Garage, events-attended count, recent events, shared event history.

### Stories

Each event becomes a permanent piece of club history — not a generic photo
gallery.

> **Napa Run** — October 10, 2026
> 21 cars. 146 miles. One very long lunch.

Large editorial photo grid with hero photograph, event details, attendees,
cars, route, photography, optional recap. The accumulating archive should make
the community increasingly desirable to join.

---

## Navigation

**Public:** Club · Experiences · Stories · Request to Join · Member Login
**Authenticated:** Home · Events · Members · Garage · Stories
**Avatar menu:** My Profile · My Garage · My Events · Settings · Sign Out

---

## Integrations

**WhatsApp** remains the conversational layer. Do **not** build custom chat.
Provide _Open Club Chat_ and event-specific _Open Event Chat_ links.

**Luma** is V1 event infrastructure: RSVP, guest registration, waitlists,
capacity, confirmation, reminders, calendar invitations. Each event record
supports a Luma URL/identifier. The website is the canonical discovery and
community experience; Luma is infrastructure behind the RSVP button.

> Architect the event data model so Luma can eventually be replaced by native
> RSVP without redesigning the product.

**Email (Resend)** for: membership invitation, approval, new major event, RSVP
confirmation if not handled by Luma, event reminder. No push notifications in
V1.

---

## Admin

Simple and protected. Optimize for simplicity, not an elaborate dashboard.

- **Members** — view applications, approve, decline, invite, deactivate, edit
- **Events** — create, edit, add photography, set category, add Luma URL, set
  capacity, publish/unpublish
- **Stories** — create recap, upload photography, associate members/cars,
  publish

---

## Data model

User · Member Profile · Car (one member → many) · Event · Event Attendance
(member → event → car being brought) · Membership Application · Event Gallery ·
Photo · Admin.

> **Do not hard-code Audi or R8 anywhere in the fundamental data model.** The
> community has an R8 heritage; the software supports any enthusiast vehicle.

---

## Technical direction

Next.js/React · Supabase (database + auth + storage) · Resend · Luma · Google
Maps · privacy-conscious analytics.

No payments. No Stripe. No subscription management. No custom messaging. No
unnecessary microservices. A beautifully executed, relatively simple web
application.

---

## Mobile first

**Extremely important.** Assume most interactions happen on a phone after
receiving a WhatsApp link. These flows must be excellent:

1. WhatsApp → Event → See who's attending → RSVP
2. WhatsApp → Member Profile → Garage
3. Homepage → Request Membership
4. Event → Route / meeting location

The mobile experience should feel closer to a beautifully designed native
application than a desktop website squeezed onto a phone.

---

## Social design principle

**Make attendance visible.** Seeing interesting people attending an event
should increase the desire to participate.

```
Napa Run — 21 / 25 going
[avatar][avatar][avatar][avatar][avatar]
R8 V10+ · GT3 · 750S · Huracán · 911 Turbo S +16
```

This creates healthy social momentum **without** social-media mechanics. There
are no follower counts, no likes, no popularity scores, no public status
hierarchy. The signal comes from participation.

---

## V1 scope

Do not overbuild. The first usable release needs:

1. Public homepage
2. Membership application
3. Authentication/invitation
4. Member dashboard
5. Upcoming events
6. Individual event pages
7. Luma RSVP integration
8. Member directory
9. Member profiles
10. Multi-car Garage
11. Past event stories/galleries
12. Basic admin

Everything else is secondary. The goal is to get the existing community using
this for a real event as quickly as possible.
