# Venturelyx — Product Requirements Document

## Original Problem Statement
Venturelyx — Business Launch & Growth Operating System. A web SaaS ("We build businesses, not websites.") that takes a small business from idea → launch → operate → get found → scale, reporting into one Business Command Center. Six modules (BUILD, SOURCE, OPERATE, SCALESEO, GROW, AI TEAM), shipped in phases, AI powered by both Claude and ChatGPT via a unified multi-model layer with routing + fallback.

## User Choices
- AI via Emergent Universal LLM key (Claude + GPT).
- Auth: JWT + hashed passwords (both requested; JWT implemented; Google login deferred).
- Broad V1 across all core modules.
- Stripe checkout for invoices.
- Agent-designed dark UI.

## Architecture
- Frontend: React (CRACO) + Tailwind + shadcn/ui, dark theme (Manrope/IBM Plex/JetBrains Mono), Recharts, phosphor-icons.
- Backend: FastAPI, modular routers (auth, business, operate, seo, reviews, ai, payments). Motor/MongoDB, uuid string ids, tenant-ready (org → business → module data scoping).
- AI: /app/backend/ai_service.py — provider-agnostic layer via emergentintegrations LlmChat. Model routing (generation=Claude Sonnet 4.6 / GPT 5.6 Luna; cheap=Haiku 4.5 / GPT 5.4 Mini; heavy=Sonnet 5 / GPT 5.6 Terra). Cross-provider fallback (Claude↔GPT). Streaming to frontend via text/plain. Per-business provider preference (auto/anthropic/openai). Usage logged in ai_logs.
- Auth: JWT in httpOnly cookie + Bearer fallback, bcrypt hashing. Seeded owner + demo business.
- Payments: Stripe claimable sandbox (Flow A), invoice checkout (payment mode, no tax), status polling + webhook, payment_transactions collection.

## Personas
- Primary: small business owner (single business in V1; schema tenant-ready for agency mode).

## Core Requirements (static)
Auth & accounts; onboarding; Command Center (Growth Score + metric cards + AI Next Best Action); Operate (CRM pipeline, jobs, invoices+Stripe); ScaleSEO (scanner, health score, prioritized issues, AI fixes + page gen, keywords, competitors, audit history, private-IP safeguard); Reviews (rating/trend/AI responses/requests); unified multi-model AI layer.

## Implemented (2026-06 / date: 2026-08-17)
- ✅ Phase 1 Foundation: auth (JWT+bcrypt), onboarding, tenant-ready schema, app shell + full module nav (locked states for Build/Source/Grow/AI-Team), multi-model AI scaffold (Claude+GPT routing/fallback).
- ✅ Phase 2 Command Center + Operate: metrics, Growth Score gauge, AI Next Best Action, leads pipeline (6 stages, pipeline $), jobs, invoices.
- ✅ Phase 3 ScaleSEO: scanner (title/meta/H1/HTTPS/speed/alt/canonical/viewport), scoring, prioritized issues, keywords, competitors, audit history, SSRF/private-IP safeguard.
- ✅ Phase 4 AI layer: streaming SEO recommendations, AI page generation, review responses, approval flow, model routing live.
- ✅ Phase 5 Reviews + polish: rating/trend, review requests, AI responses, Stripe checkout, dark UI polish.
- Verified: 27/27 backend tests pass; frontend flows verified; AI stream duplicate-token bug fixed.

## Backlog (post-V1)
- P1: Emergent Google social login (JWT already live); JobUpdate partial model; SSRF redirect-hop revalidation; origin_url allow-list for checkout.
- P1: Google APIs (Search Console, GA4, PageSpeed, Business Profile) for real SEO→lead→revenue attribution.
- P2: Full AI Team (6 assistants) with per-agent model selection; Build module (idea validation, blueprints, branding, website); Source module (suppliers, RFQs); Grow module (email/SMS, funnels, ads); industry Business-OS templates; local map-grid rank tracking; agency/white-label.

## Next Tasks
- Wire Google login option; expand Command Center attribution once Google APIs added; begin Build module.
