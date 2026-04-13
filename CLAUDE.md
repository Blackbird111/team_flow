# TeamFlow — Project Specification for Claude

## Product Overview

**TeamFlow** is a SaaS project management tool built for digital agencies and freelance studios (2–15 people). Positioning: *"Project management built for client work — not corporate chaos."*

The core differentiator from Trello/Notion: everything in one place without integrations — tasks, team, time tracking, client portal, AI analysis, internal messaging, email and Telegram notifications.

**Target audience:** English-speaking digital agencies, web studios, freelance teams managing multiple client projects simultaneously.

**Pricing model:**
- Free: 1 project, 3 members, no Client Portal, no AI
- Pro: $19/month per workspace up to 10 members, all features, +$1/month per each additional member
- Agency: $49/month per workspace up to 25 members, white-label Client Portal, +$1/month per each additional member
- Annual discount: 20% off
- Members counted by added seats, not active users

---

## Existing Foundation (SaaS Template)

The project is built on an existing SaaS starter template that already includes:
- **Auth:** Email/password, Google OAuth, magic links (NextAuth v5)
- **Payments:** Stripe subscriptions with billing portal
- **Stack:** Next.js 16, PostgreSQL via Neon (serverless), Prisma 7 ORM, Tailwind CSS, shadcn/ui
- **Deployment:** Vercel

**Do not modify or replace** the existing auth and Stripe integration. All new features are built on top of this foundation.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes / Server Actions
- **Database:** PostgreSQL via Neon (serverless), Prisma 7 ORM
- **Auth:** NextAuth v5 with PrismaAdapter (already implemented)
- **Payments:** Stripe (already implemented)
- **Email:** Resend (already integrated)
- **Telegram notifications:** Telegram Bot API
- **AI:** Anthropic Claude API (claude-sonnet-4-5-20251001)
- **Real-time:** Server-Sent Events (SSE) or polling — no Supabase Realtime

---

## Database Schema

### Core Architecture

```
Workspace (agency account)
  └── Projects (client projects)
        └── TodoItems (shared project to-do list)
              └── TodoAssignees (who is responsible)
              └── Comments (discussion per item)
        └── ProjectMembers (who is in this project)
  └── WorkspaceMembers (pool of all people in workspace)
```

### Tables

Prisma models (all IDs use `String @id @default(cuid())`):

```prisma
// Workspace: one per agency, linked to Stripe subscription
model Workspace {
  id                   String    @id @default(cuid())
  name                 String
  slug                 String    @unique
  ownerId              String
  owner                User      @relation(fields: [ownerId], references: [id])
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  stripePriceId        String?
  stripeCurrentPeriodEnd DateTime?
  plan                 WsPlan    @default(FREE)
  status               WsStatus  @default(INACTIVE)
  createdAt            DateTime  @default(now())
  members              WorkspaceMember[]
  projects             Project[]
}

enum WsPlan   { FREE PRO AGENCY }
enum WsStatus { ACTIVE INACTIVE CANCELED PAST_DUE }

// Pool of all members in a workspace
model WorkspaceMember {
  id             String    @id @default(cuid())
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId         String?   // null for invited members who haven't registered yet
  user           User?     @relation(fields: [userId], references: [id])
  name           String
  email          String?
  role           WsMemberRole @default(MEMBER)
  telegramChatId String?
  avatarUrl      String?
  hourlyRate     Decimal?  @db.Decimal(10,2)
  createdAt      DateTime  @default(now())
  projectMembers ProjectMember[]
  timeLogs       TimeLog[]
  comments       Comment[]
  todoAssignees  TodoAssignee[]
  @@unique([workspaceId, userId])
}

enum WsMemberRole { ADMIN MEMBER }

model Project {
  id                 String    @id @default(cuid())
  workspaceId        String
  workspace          Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name               String
  description        String?
  status             ProjectStatus @default(ACTIVE)
  clientName         String?
  clientPortalEnabled Boolean  @default(false)
  clientPortalSlug   String?   @unique
  deadline           DateTime?
  budgetUsd          Decimal?  @db.Decimal(10,2)
  createdById        String?
  createdBy          WorkspaceMember? @relation(fields: [createdById], references: [id])
  createdAt          DateTime  @default(now())
  archivedAt         DateTime?
  members            ProjectMember[]
  sections           TodoSection[]
  todoItems          TodoItem[]
  timeLogs           TimeLog[]
  clientRequests     ClientRequest[]
}

enum ProjectStatus { ACTIVE COMPLETED ARCHIVED }

model ProjectMember {
  id                String    @id @default(cuid())
  projectId         String
  project           Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workspaceMemberId String
  workspaceMember   WorkspaceMember @relation(fields: [workspaceMemberId], references: [id], onDelete: Cascade)
  role              ProjectRole @default(CONTRIBUTOR)
  hourlyRate        Decimal?  @db.Decimal(10,2)
  addedAt           DateTime  @default(now())
  @@unique([projectId, workspaceMemberId])
}

enum ProjectRole { MANAGER CONTRIBUTOR CLIENT }

model TodoSection {
  id        String    @id @default(cuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title     String
  position  Int
  createdAt DateTime  @default(now())
  items     TodoItem[]
}

model TodoItem {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sectionId   String?
  section     TodoSection? @relation(fields: [sectionId], references: [id])
  text        String
  position    Int
  status      TodoStatus @default(OPEN)
  completedAt DateTime?
  createdById String?
  createdBy   WorkspaceMember? @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  assignees   TodoAssignee[]
  comments    Comment[]
  timeLogs    TimeLog[]
}

enum TodoStatus { OPEN IN_PROGRESS COMPLETED }

model TodoAssignee {
  id                String    @id @default(cuid())
  todoItemId        String
  todoItem          TodoItem  @relation(fields: [todoItemId], references: [id], onDelete: Cascade)
  workspaceMemberId String
  workspaceMember   WorkspaceMember @relation(fields: [workspaceMemberId], references: [id], onDelete: Cascade)
  completed         Boolean   @default(false)
  completedAt       DateTime?
  @@unique([todoItemId, workspaceMemberId])
}

model Comment {
  id                String    @id @default(cuid())
  todoItemId        String
  todoItem          TodoItem  @relation(fields: [todoItemId], references: [id], onDelete: Cascade)
  authorId          String
  author            WorkspaceMember @relation(fields: [authorId], references: [id])
  text              String
  createdAt         DateTime  @default(now())
}

model TimeLog {
  id                String    @id @default(cuid())
  projectId         String
  project           Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  todoItemId        String?
  todoItem          TodoItem? @relation(fields: [todoItemId], references: [id])
  workspaceMemberId String
  workspaceMember   WorkspaceMember @relation(fields: [workspaceMemberId], references: [id])
  minutes           Int
  description       String?
  loggedAt          DateTime  @default(now()) @db.Date
  createdAt         DateTime  @default(now())
}

model ClientRequest {
  id               String    @id @default(cuid())
  projectId        String
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clientName       String
  clientEmail      String?
  title            String
  description      String?
  status           RequestStatus @default(PENDING)
  pmNote           String?
  convertedToTodoId String?
  createdAt        DateTime  @default(now())
  resolvedAt       DateTime?
}

enum RequestStatus { PENDING ACCEPTED DECLINED CLARIFICATION }
```

### Authorization — application-level (not database RLS)

Since we use Prisma (no Supabase RLS), access control is enforced in API route handlers and Server Actions:
- Always verify `session.user.id` belongs to the workspace/project being accessed
- Helper: `assertWorkspaceMember(userId, workspaceId)` — throws 403 if not member
- Helper: `assertProjectMember(userId, projectId)` — throws 403 if not member
- Workspace admin checks: `assertWorkspaceAdmin(userId, workspaceId)`
- Project manager checks: `assertProjectManager(userId, projectId)`

---

## Core Features

### 1. Workspace & Multi-Project Management

- Each agency has one Workspace (linked to Stripe subscription)
- Workspace Admin manages the member pool and billing
- Multiple projects within one workspace — each project is isolated
- Top navigation shows project switcher (dropdown or sidebar)
- Member pool: add person once to workspace, then assign to any project

### 2. Roles

**Workspace level:**
- `admin` — sees all projects, manages billing, manages member pool
- `member` — sees only projects they are added to

**Project level:**
- `manager` (Project Manager) — full access, assigns tasks, sees all items active, can mark anyone's items complete, manages project members
- `contributor` — sees all items, but only their assigned items are active/clickable, can only mark own items complete
- `client` — read-only Client Portal access only

### 3. Shared To-Do List (Core Feature)

This is the central feature of the product. One unified list per project visible to all members.

**Visual states of a todo item:**
- **Active** (bright) — assigned to current user, clickable
- **Grey** (read-only) — assigned to others, visible but not interactive
- **Partially completed** — some assignees done, shows progress indicator
- **Completed** — all assignees marked done, strikethrough text, moves to bottom
- **Red / No assignee** — member was removed, item has no responsible person, requires PM attention

**Completion logic for multi-assignee items:**
- Item is completed ONLY when ALL assignees click "done"
- When first assignee marks done: show list below item → "✓ Alice · ○ Boris · ○ Victor"
- Green checkmark = done, grey circle = pending
- When last assignee marks done: item turns completed (strikethrough), PM gets notification

**Sections:**
- PM can create named sections (e.g. "Design", "Development", "Testing")
- Items can be organized into sections
- Drag-and-drop reordering within sections

**When member is removed from project:**
- Their todo items remain in the list
- Items without assignees are highlighted red
- PM must reassign them

### 4. Time Tracking

- Timer button on each todo item — start/stop
- Manual time entry also possible
- Time log saved per member per item
- Time tab: shows total per member, full log table
- Archive stores time data per project

### 5. Comments

- Each todo item has a comment thread
- Click to expand — shows full thread
- All project members can comment
- @mentions notify specific members
- Stored in archive when project is completed

### 6. AI Features (Claude API)

**AI Project Plan:**
- PM describes project in text
- Claude generates 6-8 tasks with dates, assignees, priorities
- PM reviews and applies to project with one click

**AI Project Analysis:**
- Analyzes tasks, deadlines, progress, team workload
- Warns about risks: "Diana is overloaded, project may be late"
- Suggests rebalancing

**AI Weekly Report:**
- Every Monday generates email report for PM
- Summary: tasks completed, in progress, time logged, blockers
- One click to forward to client

**AI Archive Insights:**
- Analyzes completed projects
- Shows patterns: which task types take longest, who is most effective at what
- Helps estimate timelines for new similar projects

### 7. Client Portal

- Read-only view for client, accessible via unique URL
- Shows: project progress, task statuses, timeline
- No internal comments visible, no time logs
- Can be enabled/disabled per project by PM
- White-label (custom logo) on Agency plan

### 8. Notifications

**Telegram:**
- User adds their Telegram chat_id in profile settings
- Notifications: assigned to item, deadline in 24h, comment on your item, item completed by all, item has no assignee (to PM)
- Implemented via Telegram Bot API

**Email (transactional via Resend):**
- Same triggers as Telegram
- Fallback when Telegram not configured
- Weekly project report every Monday morning

**Email (marketing via Resend):**
- Onboarding sequence: 5-7 emails over first 2 weeks
- Re-engagement: user inactive for 14 days
- Monthly newsletter with agency productivity tips
- Always include unsubscribe link (GDPR compliant)

### 10. Project Templates

- PM can save any completed project as a template
- Template stores: all sections, all todo items (without assignees and completion data)
- When creating a new project: option to start from template
- All sections and items copied automatically, PM then assigns members
- Templates are stored at workspace level — available across all projects
- Suggested default templates on first use: "Website Redesign", "Mobile App", "Branding Project"

### 11. Project Budget

- PM sets total budget (in USD) when creating or editing a project
- Each workspace member has an hourly rate (set by workspace admin, editable per project)
- System automatically calculates budget spent based on logged time × hourly rate
- Dashboard shows: Total budget / Spent / Remaining + visual progress bar
- Color indicator: green (under 75%), yellow (75–90%), red (over 90%)
- PM receives Telegram + email notification when budget reaches 80% and 100%
- Client Portal: PM can choose to show or hide budget info to client
- Archive stores final budget report per project

Budget fields are already included in the Prisma schema above: `budgetUsd` on `Project`, `hourlyRate` on `ProjectMember`.

### 12. Client Requests

- Simple request form inside Client Portal
- Client fills in: request title + description (optional file attachment)
- PM receives instant Telegram + email notification: "New request from [Client Name]"
- PM sees all requests in a dedicated "Requests" tab within the project
- PM can:
  - **Accept** → request converts into a new todo item (with section assignment)
  - **Decline** → PM adds a note explaining why, client sees status updated
  - **Ask for clarification** → PM replies, client gets email notification
- Request statuses: Pending / Accepted / Declined / Converted to task
- Client sees status of all their requests in Client Portal
- All requests stored in archive when project is completed

The `ClientRequest` model is already included in the Prisma schema above.

- Completed projects move to Archive
- Archive stores: all todo items with statuses, who was assigned, who completed what and when, all comments, all time logs
- Exportable to PDF
- Searchable

---

## Project Main Screen Layout

### Two-column layout

**Left (main area, ~75% width):** Full todo list with sections and items.

**Right sidebar (~25% width):** Vertical list of project members. Each member shown as: avatar + name + role + count of their active items.

### Member filter interaction

- Click on a member in the sidebar → their assigned todo items highlight in the main list, all other items dim (reduced opacity)
- Click the same member again → filter clears, all items return to normal
- Only one member can be active filter at a time
- PM sees this filter too — useful for quick workload review
- Filter is client-side only, no page reload
- Highlighted items show the member's avatar badge so it's clear why they're highlighted
- On mobile: sidebar collapses into a horizontal scrollable row of avatars above the list

- Clean, minimal, white surfaces — no gradients, no clutter
- Mobile-first for viewing status, desktop for managing
- Top navigation: workspace name + project switcher
- Tabs per project: Dashboard, Tasks/Todo, Time, Team, AI, Client Portal, Archive
- Color system:
  - Active items: normal
  - Grey: not your item
  - Green: completed
  - Red: no assignee / overdue
  - Blue: in progress

---

## Development Priorities

Build in this order:

1. Database schema (Prisma migrations) — see migration plan in this file
2. Workspace + multi-project navigation on top of existing auth
3. Member pool management + project member assignment
4. Roles (workspace admin, project manager, contributor)
5. Todo list with sections, assignees, completion logic
6. Comments on todo items
7. Time tracking
8. Project Budget tracking
9. Project Templates
10. Telegram notifications
11. Email transactional notifications
12. Client Portal
13. Client Requests (inside Client Portal)
14. AI Project Plan generation
15. AI Analysis + weekly report
16. Archive + PDF export
17. Marketing email sequences

---

## What Already Exists (Do Not Rebuild)

- User registration and login (NextAuth v5 — email/password + bcrypt)
- Google OAuth (NextAuth)
- Magic link auth via Resend (NextAuth)
- Email verification flow (custom tokens stored in User model)
- Forgot/reset password flow
- Stripe subscription management (Checkout + Webhook + Portal)
- Basic Next.js 16 app structure with Tailwind and shadcn/ui
- Prisma schema: `User`, `Account`, `Session`, `VerificationToken`

**What to remove (not needed for TeamFlow):**
- `Message` model and all chat functionality (`/chat` page, `/api/chat/` routes, `useChat` hook)
- Existing `Subscription` model — replace with billing on `Workspace`
- Existing `Plan` / `SubStatus` enums — replace with `WsPlan` / `WsStatus`
- Existing PLANS config in `stripe.ts` — replace with FREE / PRO / AGENCY