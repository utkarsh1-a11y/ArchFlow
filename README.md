<div align="center">

# 🧭 ArchFlow

### Real-Time Collaborative System Design Workspace, Powered by AI

<p>
  <img src="https://img.shields.io/badge/-Next_JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=000000" alt="nextdotjs" />
  <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
  <img src="https://img.shields.io/badge/-Tailwind_CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="tailwindcss" />
  <img src="https://img.shields.io/badge/-Clerk-black?style=for-the-badge&logoColor=white&logo=clerk&color=6C47FF" alt="clerk" />
  <img src="https://img.shields.io/badge/-Liveblocks-black?style=for-the-badge&logoColor=white&color=FF6B6B" alt="liveblocks" />
  <img src="https://img.shields.io/badge/-Prisma-black?style=for-the-badge&logoColor=white&logo=prisma&color=2D3748" alt="prisma" />
  <img src="https://img.shields.io/badge/-Trigger.dev-black?style=for-the-badge&logoColor=white&color=A855F7" alt="trigger.dev" />
  <img src="https://img.shields.io/badge/-Gemini-black?style=for-the-badge&logoColor=white&logo=googlegemini&color=8E75B2" alt="gemini" />
  <img src="https://img.shields.io/badge/-Vercel-black?style=for-the-badge&logoColor=white&logo=vercel&color=000000" alt="vercel" />
</p>

**ArchFlow** is a full-stack, real-time collaborative workspace for system design — describe a system in plain English, let an AI agent draft it as a live architecture diagram, refine it together with your team, and export the final graph as a technical specification.

</div>

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Tech Stack](#️-tech-stack)
3. [Key Features](#-key-features)
4. [How the AI Pipeline Works](#-how-the-ai-pipeline-works)
5. [Architecture Highlights](#️-architecture-highlights)
6. [Project Structure](#-project-structure)
7. [Getting Started](#-getting-started)
8. [Environment Variables](#-environment-variables)
9. [Future Improvements](#-future-improvements)

---

## 🤖 Overview

**ArchFlow** turns a blank canvas into a shared architecture whiteboard with an AI co-designer sitting inside it. Instead of dragging boxes and arrows one by one, a user can describe a system — "an event-driven order pipeline with a queue and three consumers" — and the AI agent writes real nodes and edges directly into a shared, live canvas that every collaborator sees update in real time.

Two AI-driven capabilities sit at the core of the app:

- **Design Generation** — turn a natural-language prompt (plus the current canvas state) into structured architecture nodes and edges, written live into the shared room
- **Spec Generation** — turn the finished canvas graph into a persisted Markdown technical specification, ready to review or download

Everything else — auth, project ownership, collaborator access, a curated starter-template library, and live multiplayer presence — exists to support that core loop: **describe it, watch it get drawn, refine it together, export it.**

Built with **Next.js (App Router)** and backed by **Clerk** (auth), **Prisma + PostgreSQL** (metadata), **Liveblocks + React Flow** (real-time canvas), **Trigger.dev** (durable AI background jobs), **Vercel Blob** (generated artifacts), and **Google Gemini** through the Vercel AI SDK for all generation.

---

## ⚙️ Tech Stack

| Layer            | Technology                                    | Purpose                                                     |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Framework        | **Next.js 16** (App Router)                   | SSR, routing, API route handlers                            |
| Language         | **TypeScript**                                | End-to-end type safety                                      |
| Auth             | **Clerk**                                     | User identity, sign-in/sign-up, route protection            |
| Database         | **Prisma + PostgreSQL**                       | Project metadata, collaborators, spec records, task runs    |
| Real-Time Canvas | **Liveblocks + React Flow (`@xyflow/react`)** | Shared canvas state, live cursors, presence, node/edge sync |
| Background Jobs  | **Trigger.dev**                               | Durable, long-running AI generation tasks                   |
| Artifact Storage | **Vercel Blob**                               | Canvas snapshots and generated Markdown specs               |
| AI               | **Google Gemini** (via **Vercel AI SDK**)     | Architecture generation and spec generation                 |
| Styling          | **Tailwind CSS + shadcn/ui + Base UI**        | Utility-first styles + accessible component primitives      |
| Deployment       | **Vercel**                                    | Hosting for the app and API routes                          |

---

## 🔋 Key Features

### 🗂️ Projects & Collaboration

- **Clerk Authentication** — Full sign-in/sign-up flow with protected routes
- **Project Ownership** — Every project belongs to a single owner, with additional collaborators invited by email
- **Access-Controlled Rooms** — Liveblocks room tokens are only issued after verifying project membership; non-members hit an access-denied state
- **Project Sidebar & Share Dialog** — Manage collaborators and project settings without leaving the workspace

### 🖼️ Real-Time Collaborative Canvas

- **Shared Canvas** — Built on Liveblocks + React Flow; every node, edge, and edit syncs live across all connected collaborators
- **Live Presence** — Real-time cursors and collaborator avatars show who's editing and where
- **Rich Node Editing** — Shape panel, color toolbar, inline label editing, and configurable node/edge behavior
- **Canvas Autosave** — Canvas state is snapshotted and persisted automatically as it changes
- **Starter Template Library** — Prebuilt system-design templates (monolith, microservices, event-driven, CI/CD pipeline, serverless, and more) that can be imported into the canvas at any point, following the same node/edge schema as user-created content

### 🤖 AI-Powered Architecture Generation

- **Prompt-to-Diagram** — Describe a system in plain English; the AI agent generates structured nodes and edges and writes them directly into the shared room
- **Context-Aware** — Generation takes the current canvas state and project context into account, so the AI extends existing designs rather than overwriting them
- **AI Sidebar** — A dedicated chat-style panel for prompting the design agent and reviewing its running feed of actions
- **Durable Execution** — Generation runs as a background task via Trigger.dev, so it survives page navigation and doesn't block API requests

### 📄 Spec Generation & Export

- **Graph-to-Markdown** — Converts the current canvas graph and chat history into a structured Markdown technical specification
- **Persisted Artifacts** — Specs are saved to Vercel Blob and linked to the project via a database record, with full history per project
- **Review & Download** — Users can view generated specs in-app or download them directly

---

## 🧠 How the AI Pipeline Works

```
User enters a prompt in the AI sidebar
      │
      ▼
POST /api/ai/design → ownership/auth check → Trigger.dev task queued
      │
      ▼
design-agent.ts (Trigger.dev background task)
      │
      ├─ Reads current canvas state (nodes, edges) + project context
      ├─ Calls Google Gemini via the Vercel AI SDK
      └─ Produces structured node/edge updates
      │
      ▼
Updates written directly into the shared Liveblocks room
      │
      ▼
All connected collaborators see the diagram update live — no refresh
─────────────────────────────────────────────
User triggers "Generate Spec"
      │
      ▼
POST /api/projects/[projectId]/specs → Trigger.dev task queued
      │
      ▼
generate-spec.ts (Trigger.dev background task)
      │
      ├─ Builds context from canvas nodes, edges, and AI chat history
      ├─ Calls Google Gemini to draft a Markdown technical spec
      └─ Uploads the result to Vercel Blob (specs/{projectId}/{specId}.md)
      │
      ▼
ProjectSpec record saved to PostgreSQL, linked to the project
      │
      ▼
User views or downloads the spec from the workspace
```

All AI generation runs as **Trigger.dev background tasks**, not inline in request handlers — API routes only validate, authorize, and queue work, keeping long-running model calls off the request/response cycle.

---

## 🏗️ Architecture Highlights

- **Request Handlers vs. Background Tasks** — `app/api` handles auth, validation, and task triggering only; all long-running AI work lives in `trigger/`, kept off the request/response cycle
- **Two-Layer Storage Model** — Relational metadata (projects, collaborators, spec records, task runs) lives in PostgreSQL via Prisma; large generated artifacts (canvas snapshots, Markdown specs) live in Vercel Blob, referenced from the database by URL
- **Ownership Enforced at Every Mutation** — Every project has a single owner, with collaborator access checked before any Liveblocks room token is issued or any resource is mutated
- **Schema-Consistent Templates** — Starter system-design templates are static canvas snapshots that follow the exact same node/edge schema as user-created content, so they can be imported without a separate database record
- **Protected Foundation Components** — `components/ui/*` (shadcn/ui primitives) remain untouched defaults; feature and layout logic lives in app-level components instead

---

## 📁 Project Structure

```
ArchFlow/
│
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── design/route.ts + token/route.ts    # Trigger AI design generation
│   │   │   └── spec/route.ts + token/route.ts      # Trigger AI spec generation
│   │   ├── projects/
│   │   │   ├── route.ts                            # Project list/create
│   │   │   └── [projectId]/
│   │   │       ├── route.ts                        # Project detail/update/delete
│   │   │       ├── canvas/route.ts                 # Canvas snapshot persistence
│   │   │       ├── collaborators/route.ts          # Collaborator management
│   │   │       └── specs/                          # Spec list, detail, download
│   │   └── liveblocks-auth/route.ts                 # Room token issuance
│   │
│   ├── editor/
│   │   ├── page.tsx                                 # Project home
│   │   └── [roomId]/page.tsx                        # Collaborative canvas workspace
│   │
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── editor/
│   │   ├── canvas/
│   │   │   ├── canvas-editor.tsx        # Canvas root
│   │   │   ├── canvas-room.tsx          # Liveblocks room provider
│   │   │   ├── canvas-node.tsx / canvas-edge.tsx
│   │   │   ├── canvas-controls.tsx / shape-panel.tsx
│   │   │   ├── presence-cursors.tsx / collaborator-avatars.tsx
│   │   ├── ai-sidebar.tsx               # AI prompt + chat feed
│   │   ├── editor-workspace-client.tsx / editor-navbar.tsx
│   │   ├── editor-home-client.tsx / project-sidebar.tsx
│   │   ├── project-dialogs.tsx / project-share-dialog.tsx
│   │   ├── starter-templates.ts / starter-templates-modal.tsx
│   │   └── access-denied.tsx
│   └── ui/                              # shadcn/ui primitives
│
├── trigger/
│   ├── design-agent.ts                  # AI architecture generation task
│   └── generate-spec.ts                 # AI Markdown spec generation task
│
├── lib/
│   ├── prisma.ts                        # Prisma client
│   ├── liveblocks.ts                    # Liveblocks server client
│   ├── projects.ts / project-access.ts / project-collaborators.ts
│   └── utils.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── models/project.prisma            # Project, ProjectSpec, ProjectCollaborator, TaskRun
│   └── migrations/
│
├── hooks/
│   ├── use-canvas-autosave.ts
│   ├── use-project-actions.ts / use-project-dialogs.ts / use-project-share.ts
│   └── useKeyboardShortcuts.ts
│
├── types/
│   ├── canvas.ts
│   └── tasks.ts
│
├── liveblocks.config.ts
├── trigger.config.ts
└── prisma.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en) v18+
- [Git](https://git-scm.com/)
- A [Clerk](https://clerk.com) account (free tier)
- A [PostgreSQL](https://www.postgresql.org) database (or run `npx create-db` for a free hosted instance)
- A [Liveblocks](https://liveblocks.io) account
- A [Trigger.dev](https://trigger.dev) account
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store
- A [Google AI Studio](https://aistudio.google.com) Gemini API key

### 1. Clone

```bash
git clone https://github.com/<your-username>/ArchFlow.git
cd ArchFlow
```

### 2. Install

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 3. Environment Variables

Create `.env` in the project root (see [Environment Variables](#-environment-variables) below).

### 4. Set Up the Database

```bash
npx prisma migrate deploy
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run AI background tasks locally, also start the Trigger.dev dev server:

```bash
npx trigger.dev@latest dev
```

---

## 🔐 Environment Variables

| Variable                            | Description                      |
| ----------------------------------- | -------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key            |
| `CLERK_SECRET_KEY`                  | Clerk secret key                 |
| `LIVEBLOCKS_SECRET_KEY`             | Liveblocks server secret key     |
| `TRIGGER_SECRET_KEY`                | Trigger.dev project secret key   |
| `BLOB_READ_WRITE_TOKEN`             | Vercel Blob read/write token     |
| `GOOGLE_GENERATIVE_AI_API_KEY`      | Gemini API key for AI generation |

> Exact variable names may differ slightly by provider version — check `lib/prisma.ts`, `lib/liveblocks.ts`, and the `trigger/` tasks for the values actually read at runtime if you're wiring up a fresh environment.

---

## 🔭 Future Improvements

- Versioned spec history with diffing between generations
- Role-based collaborator permissions (view-only vs. edit)
- Richer AI-sidebar chat feed with inline diff previews before writing to canvas
- Migrating starter templates to database-backed, user-editable template library
- Export formats beyond Markdown (PDF, diagrams-as-code)

---

<div align="center">
  <sub>Built with Next.js · Clerk · Liveblocks · Prisma · Trigger.dev · Gemini · Tailwind CSS</sub>
</div>
