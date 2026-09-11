---
title: "Gilloe Safety, Security, and Risk Guide"
description: "Practical safety, privacy, security, and operating principles for Gilloe's location-based real-world adventure platform."
---

# Gilloe Safety, Security, and Risk Guide

## Building a Safer Location-Based Real-World Adventure Platform

**Published:** September 10, 2026  
**Project stage:** Concept validation and pilot planning  
**Audience:** Players, creators, participating businesses, partners, and project stakeholders

> A real-world game must treat the real world as part of the product.

Gilloe turns neighborhoods into playable worlds. Players walk through real places, follow stories, discover clues, and solve challenges together. That creates an experience that can feel more memorable than a game played entirely on a screen. It also creates responsibilities that ordinary digital games do not have.

The most serious risks are physical injury, misuse of location information, unsafe creator-made routes, harmful interactions between strangers, and failures that leave players stranded during an experience. These risks are manageable, but safety and privacy must be built into Gilloe from the first pilot.

This document describes proposed product and operating principles. It is not legal, insurance, or cybersecurity advice. Gilloe’s exact obligations will depend on its final design, data practices, audience, and markets.

## TL;DR

- Gilloe’s highest-priority risks are physical player safety, location privacy, stranger interactions, and unsafe creator content.
- The first pilot should run during daylight on a field-tested public route for pre-existing groups of 2–4 adults.
- Gilloe should check location only while a game is active and avoid storing a detailed history of each player’s movements.
- Essential clues should never require a purchase, a staff interaction, or access to a single location with no fallback.
- Creator games should be reviewed and physically tested before publication.
- Stranger matching, minors, valuable prizes, continuous tracking, and open self-publishing should come later, after dedicated safeguards exist.
- Payments should use a trusted payment provider so Gilloe does not store card numbers.
- Gilloe needs a way to pause a route immediately when a location becomes unsafe or unavailable.

## Table of Contents

1. [Risk Overview](#1-risk-overview)
2. [Physical Player Safety](#2-physical-player-safety)
3. [Location Privacy](#3-location-privacy)
4. [Multiplayer and Stranger Safety](#4-multiplayer-and-stranger-safety)
5. [Creator Content Risks](#5-creator-content-risks)
6. [Participating Business Risks](#6-participating-business-risks)
7. [Application and Account Security](#7-application-and-account-security)
8. [QR Codes, Clues, and Reward Fraud](#8-qr-codes-clues-and-reward-fraud)
9. [Payments and Consumer Protection](#9-payments-and-consumer-protection)
10. [AI Content Risks](#10-ai-content-risks)
11. [Server Reliability and Incident Response](#11-server-reliability-and-incident-response)
12. [International and Regional Data Risks](#12-international-and-regional-data-risks)
13. [First-Pilot Safety Design](#13-first-pilot-safety-design)
14. [Pre-Launch Checklist](#14-pre-launch-checklist)
15. [Recommended Sequence](#15-recommended-sequence)
16. [References](#16-references)

## 1. Risk Overview

| Risk | Example | Priority |
| --- | --- | --- |
| Physical safety | A player crosses a road while reading a clue or enters an unsafe area | Critical |
| Location privacy | A breach reveals where users played and when | Critical |
| Stranger interactions | Harassment, stalking, inappropriate behavior, or unsafe meetings | Critical |
| Creator content | A creator sends players onto private property or through a dangerous route | High |
| Merchant conflict | Players disturb customers, staff misunderstand the activity, or a venue closes | High |
| Account security | Someone takes over a creator account, changes games, or redirects payouts | High |
| QR manipulation | Someone covers a Gilloe marker with a malicious QR code | High |
| Payment and reward fraud | Stolen cards, repeated coupon redemption, fake completion, or refund abuse | Medium–high |
| Service failure | A route stops working while players are outside | Medium–high |
| AI-generated errors | False historical claims, impossible clues, offensive content, or nonexistent locations | Medium–high |
| Weak economics | Safety, support, moderation, and maintenance cost more than the game earns | High |

One serious injury or location-data incident could damage player trust and merchant relationships before Gilloe has time to establish itself. Safety and security work therefore protect both users and the business.

## 2. Physical Player Safety

Gilloe should never require players to read, type, photograph, or solve a puzzle while crossing a road or moving through a crowded area. Clues should activate at safe stopping points where a team can gather without blocking other people.

Every route should receive an on-site review for:

- Road crossings, vehicle entrances, bicycle paths, and construction
- Stairs, slopes, uneven surfaces, low lighting, and seasonal hazards
- Private property, restricted areas, and residential disruption
- Weather exposure, available shelter, and safe operating hours
- Public transportation and a clear way to leave the route
- Accessibility information, rest points, and alternative paths
- Crowd capacity at each stop
- Mobile reception and battery requirements

### Route operating rules

A route should have defined operating hours rather than being described as available at any time. A route that is appropriate at 2:00 p.m. may be unsafe or disruptive at 11:00 p.m.

Gilloe should pause a route during severe weather, construction, public emergencies, unusual crowding, or changes that make the published path unsafe. Players need an obvious **Stop Game** option that provides directions back to a safe transportation point.

Safety instructions should be short and shown when relevant. Constant warnings may cause users to ignore the message that matters. For example, the application can require players to confirm that they have stopped walking before displaying a puzzle near a road.

### Liability and insurance

Terms and waivers can explain ordinary risks, but they do not replace safe design, reasonable maintenance, or appropriate insurance. Before accepting commercial bookings, Gilloe should discuss public-liability coverage, participant injury, property damage, creator responsibility, and event coverage with qualified Korean legal and insurance professionals.

## 3. Location Privacy

Location history can reveal where a person lives, works, studies, socializes, or travels. A precise record of movement may be far more sensitive than a completed-game badge.

Gilloe should follow a minimum-data approach:

- Request location only while a location-dependent game is active.
- Avoid background location permission unless a future feature can demonstrate a clear need.
- Verify that a device is near a checkpoint without storing the complete route taken between checkpoints.
- Store a checkpoint completion record instead of continuous latitude and longitude whenever possible.
- Do not display one player’s precise live location to strangers.
- Keep precise coordinates out of ordinary analytics, customer-support screens, and application logs.
- Delete temporary location events according to a short, documented retention schedule.
- Let users withdraw consent and request deletion through an understandable process.
- Explain which service providers receive data and why.

Korea has specific rules governing location information. The official law addresses consent, minimum necessary collection, protection measures, user rights, and reporting requirements for certain location-related businesses. Gilloe should determine its current legal classification before launch because the requirements depend on how it obtains and uses location information. [Act on the Protection and Use of Location Information](https://www.law.go.kr/LSW/lsInfoP.do?chrClsCd=010202&lsiSeq=236317&urlMode=engLsInfoR&viewCls=engLsInfoR)

Korea’s Personal Information Protection Act also requires clear handling of personal information and recognizable consent requests where consent is the relevant basis. [Personal Information Protection Act](https://www.law.go.kr/lsInfoP.do?lsiSeq=270351&urlMode=engLsInfoR&viewCls=engLsInfoR)

## 4. Multiplayer and Stranger Safety

Playing with existing friends is materially different from meeting unknown participants. Stranger matching can introduce harassment, stalking, discrimination, pressure to share contact details, inappropriate photography, and unsafe behavior after an event.

Gilloe should begin with private groups whose members already know one another. If scheduled stranger games are introduced later, they should include:

- Adults-only participation during the initial release
- Public, staffed, or highly visible meeting points
- Group formats rather than default one-to-one matching
- Blocking, reporting, and participant-removal procedures
- No public display of phone numbers, home locations, or precise live positions
- Clear behavior standards and consequences
- A host or reachable moderator during the event
- A safe way for any participant to leave
- A fallback that lets the remaining team finish if someone leaves or fails to arrive

Gilloe should not describe a participant-matching feature as safe merely because identity information has been collected. Identity checks can discourage some abuse, but they cannot predict behavior or replace moderation and careful event design.

## 5. Creator Content Risks

Open creation can expand Gilloe’s catalog, but unrestricted publication would allow unsafe routes, misleading claims, offensive material, fake merchant partnerships, and intellectual-property violations.

New creator games should pass several gates:

1. Automated checks for missing route information and prohibited content
2. Human editorial and safety review
3. Permission confirmation for participating businesses and private locations
4. A complete field test at the intended time of day
5. A blind test by people who do not know the answers
6. Final approval with a named maintenance owner

Every game should have a report button and an immediate unpublishing mechanism. Safety reports should outrank ordinary quality complaints.

Creators should confirm that they own or are authorized to use text, images, music, characters, and other intellectual property. A fictional crime must not make a real person or business appear connected to criminal or harmful conduct.

Published historical claims should be checked against reliable sources. Sensitive cultural locations require additional judgment even when public access is technically permitted.

## 6. Participating Business Risks

A game can send multiple groups into a business during busy periods. Players may block an entrance, occupy seats without purchasing, repeatedly ask staff for help, or search areas that are not open to the public.

Each participating business should have a written operating brief covering:

- Approved location and player activity
- Maximum group size and expected visit frequency
- Permitted hours and blackout periods
- Whether photography is allowed
- What staff are expected to do
- What players may receive or redeem
- Contact details for problems
- A one-step method to pause participation

Staff should not need to remember complicated dialogue or manage the main clue. The essential experience needs a digital fallback if a business is closed, crowded, or temporarily unavailable.

Required purchases can make a paid game feel deceptive and can create consumer disputes. Essential clues should be included in the game price. Optional purchases and rewards should be explained before checkout.

## 7. Application and Account Security

Gilloe will hold account information, game progress, creator content, merchant data, and possibly creator earnings. Different users must only access information and actions appropriate to their role.

Minimum controls should include:

- Encrypted connections for all application and administrative traffic
- Encryption for sensitive stored data
- Secure authentication and optional multi-factor authentication for creators, merchants, and administrators
- Separate access permissions for players, creators, merchants, support staff, and administrators
- Additional verification before changing payout or account-recovery details
- Short-lived sessions and secure account recovery
- Rate limits against automated abuse and credential attacks
- No passwords, private keys, or unrestricted service credentials inside the mobile application
- Security updates for application dependencies
- Audit records for publishing, payout, permission, and administrative changes
- Review of third-party analytics, map, AI, messaging, and advertising components

The OWASP Mobile Application Security Verification Standard provides a practical baseline covering storage, cryptography, authentication, network communication, platform interaction, application code, resilience, and privacy. [OWASP MASVS](https://mas.owasp.org/MASVS/)

OWASP also recommends minimizing access to sensitive resources and limiting third-party data sharing to what the service actually requires. [OWASP privacy control](https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/)

## 8. QR Codes, Clues, and Reward Fraud

Physical QR codes can be covered or replaced with codes leading to malicious websites. Gilloe markers should use recognizable branding and tamper-aware placement. The application should recognize Gilloe links and warn users before opening an unrelated external address.

For stronger protection, a QR code can contain a short-lived or signed value that the server verifies. This does not stop physical replacement, but it prevents an attacker from inventing valid Gilloe completion codes.

Reward systems can attract fake accounts, GPS spoofing, repeated redemptions, screenshots of codes, and coordinated abuse. Controls can include:

- One redemption per eligible account or team
- Short redemption windows
- Server-side completion verification
- Single-use reward tokens
- Merchant confirmation that does not expose customer information
- Limits on unusually valuable rewards
- Manual review for suspicious patterns

Anti-fraud measures should remain proportional. Collecting identity documents for a low-value digital badge would create more privacy risk than the reward justifies.

## 9. Payments and Consumer Protection

Gilloe should use a reputable payment provider and avoid storing card numbers. The platform still needs controls around refunds, creator payouts, stolen accounts, disputed transactions, and merchant billing.

Before payment, players should see:

- Whether the price is per person or per team
- The complete duration and walking distance
- Operating hours and location restrictions
- Any optional or required additional cost
- Weather and cancellation rules
- Accessibility limitations
- Refund treatment when a route or server fails

Korea’s electronic-commerce framework covers information duties, prohibited conduct, and consumer cancellation rights for online transactions. The exact treatment of a digital experience can depend on how and when it is supplied, so Gilloe’s checkout and refund terms should receive local review. [Korea Fair Trade Commission: E-commerce Policy](https://www.ftc.go.kr/eng/contents.do?key=560)

Creator and merchant payouts create additional risks. Gilloe should verify payout changes, delay suspicious transactions, retain appropriate accounting records, and avoid allowing support staff to change financial destinations without oversight.

## 10. AI Content Risks

AI can help creators draft stories and puzzles, but it can also produce false facts, copied material, offensive stereotypes, inaccessible routes, nonexistent locations, or mysteries that cannot logically be solved.

AI-generated content should remain a draft until a human creator and Gilloe reviewer approve it. The review should confirm:

- Every location exists and is safely accessible
- The ending follows from evidence available to the player
- Hints progress from gentle assistance to direct help
- Real people and businesses are not falsely portrayed
- Historical and cultural claims are supported
- Text, images, and audio can legally be used
- Translations preserve safety instructions and puzzle meaning
- A route can survive the loss of any fragile clue or location

Player conversations, photographs, and precise location records should not be sent to an AI provider merely because AI tools are available. Any such use needs a defined purpose, appropriate notice, data controls, and a less intrusive alternative where practical.

## 11. Server Reliability and Incident Response

A server outage during an outdoor activity is more serious than an unavailable marketing page. Players may be far from the starting point, unsure where to go, or unable to retrieve a purchased experience.

Gilloe should provide:

- Cached safety instructions and a route-exit option
- A fallback for each essential clue
- Health monitoring and alerts
- Regular backups and tested restoration
- A way to disable a route without taking down the entire platform
- A public support channel during operating hours
- A written incident-response process
- A record of who can access production systems and user data

An incident plan should cover physical emergencies, data exposure, payment problems, harmful creator content, malicious QR replacement, unavailable merchants, and severe service interruption.

After a material incident, Gilloe should preserve evidence, limit further harm, identify affected users, and follow applicable notification requirements. The team should rehearse this process before it is needed.

## 12. International and Regional Data Risks

Adding servers in another region can improve response time, but it can also create additional copies of personal information, backups, logs, and administrative access. A global content-delivery network does not by itself determine where account or location data is stored.

Gilloe should document:

- Which region owns a live game session
- Where accounts, payments, support records, and location events are stored
- Which vendors and staff can access each category
- Whether information is copied across national borders
- How long regional backups remain
- How deletion reaches replicas and backups

An international player using a Korean route does not automatically require a separate foreign server. Gilloe can initially keep the operational system in Seoul and distribute nonsensitive images and published game content through a global cache. Additional application and database regions should follow measured demand, legal review, and a clear operating need.

## 13. First-Pilot Safety Design

The safest useful first pilot is intentionally limited:

| Area | Pilot rule |
| --- | --- |
| Players | Pre-existing groups of 2–4 adults |
| Time | Daylight and clearly published operating hours |
| Route | Public, field-tested paths with safe stopping points |
| Location access | Only while the game is active; no continuous route history |
| Multiplayer | Private groups; no stranger matching |
| Purchases | No required store purchase |
| Merchants | None initially, or one explicitly approved low-burden partner |
| Prizes | No high-value rewards |
| Creators | Founder-produced game; no public self-publishing |
| Clues | Digital fallback for every essential stop |
| Support | Reachable contact and immediate route shutdown capability |
| Weather | Defined pause, rescheduling, and refund policy |

This design still tests the essential question: whether people enjoy and pay for a Gilloe adventure. It postpones features that add substantial risk without being necessary for the first learning milestone.

## 14. Pre-Launch Checklist

### Route and physical safety

- [ ] The complete route has been walked at the intended operating time.
- [ ] Every clue can be solved from a safe stopping position.
- [ ] No task encourages unsafe road crossing or trespass.
- [ ] Construction, weather, darkness, and closure risks have been assessed.
- [ ] Accessibility, distance, stairs, and surfaces are described accurately.
- [ ] Every essential stop has a fallback.
- [ ] Players can stop and return to transportation safely.

### Privacy and security

- [ ] Location access is limited to the minimum necessary.
- [ ] Continuous GPS trails are not retained by default.
- [ ] Consent and privacy explanations use clear language.
- [ ] Sensitive information is absent from ordinary logs.
- [ ] Account, creator, merchant, and administrator permissions are separated.
- [ ] Payment-card information is handled by the payment provider.
- [ ] Creator and administrator accounts have stronger authentication.
- [ ] Backups and restoration have been tested.
- [ ] An incident-response contact and procedure exist.

### Content and operations

- [ ] People unfamiliar with the answers have completed a blind field test.
- [ ] The conclusion follows logically from available evidence.
- [ ] Merchant and private-location permissions are documented.
- [ ] Fiction cannot reasonably be mistaken for an accusation against a real person or business.
- [ ] Content rights and factual claims have been reviewed.
- [ ] The team can pause or remove the route immediately.
- [ ] Support and refund procedures are ready.

### Commercial readiness

- [ ] Price, purchase unit, additional costs, and cancellation rules are visible.
- [ ] Insurance and legal needs have been reviewed for the actual pilot design.
- [ ] Creator and merchant responsibilities are documented where applicable.
- [ ] Safety, moderation, support, and maintenance costs are included in the business model.

## 15. Recommended Sequence

Gilloe should add risk in stages rather than launching every capability together.

1. Test one daytime route with private adult groups.
2. Add payment and a clear refund process.
3. Add one approved merchant with a complete fallback.
4. Test invited creators under manual review.
5. Introduce low-value rewards with fraud controls.
6. Add scheduled private-group events.
7. Pilot moderated stranger groups with dedicated safeguards.
8. Consider minors only with age-appropriate design and verified guardian requirements.
9. Add regional servers when measured demand or data requirements justify them.

This sequence gives Gilloe time to learn from controlled sessions before exposing a large community to untested routes or social mechanics.

## 16. References

1. **Republic of Korea, Act on the Protection and Use of Location Information.** Official English legislation page covering location-information definitions, consent, protection, user rights, and business requirements. [National Law Information Center](https://www.law.go.kr/LSW/lsInfoP.do?chrClsCd=010202&lsiSeq=236317&urlMode=engLsInfoR&viewCls=engLsInfoR)
2. **Republic of Korea, Personal Information Protection Act.** Official English legislation page. [National Law Information Center](https://www.law.go.kr/lsInfoP.do?lsiSeq=270351&urlMode=engLsInfoR&viewCls=engLsInfoR)
3. **Personal Information Protection Commission.** Korea’s official privacy regulator and source of privacy guidance. [PIPC English site](https://pipc.go.kr/eng/index.do)
4. **Korea Fair Trade Commission, E-commerce Policy.** Overview of consumer information, cancellation, marketplace, and prohibited-conduct rules. [KFTC](https://www.ftc.go.kr/eng/contents.do?key=560)
5. **OWASP Mobile Application Security Verification Standard.** Security baseline for mobile storage, authentication, networks, code, platform interaction, and privacy. [OWASP MASVS](https://mas.owasp.org/MASVS/)
6. **OWASP MASVS Privacy Control.** Guidance on minimizing sensitive-data access and unnecessary third-party sharing. [MASVS-PRIVACY-1](https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/)
7. **OWASP Authentication and Authorization Controls.** Guidance for secure authentication and sensitive operations. [MASVS-AUTH](https://mas.owasp.org/MASVS/07-MASVS-AUTH/)

Sources were reviewed on September 10, 2026. Laws, regulatory guidance, technical standards, and platform requirements can change. Gilloe should verify the current Korean-language legal text and obtain professional review before commercial launch or material changes to location tracking, minors’ participation, creator payouts, or international data handling.
