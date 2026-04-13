"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  Sparkles,
  Globe,
  Check,
  ChevronRight,
  ListChecks,
  BarChart2,
  Bot,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Project color palette (mirrors dashboard) ────────────────────────────────
const COLORS = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
};

// ─── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  const members = [
    { initials: "AL", name: "Alice",   color: "#3b82f6", tasks: 3 },
    { initials: "BO", name: "Boris",   color: "#a855f7", tasks: 2 },
    { initials: "CA", name: "Carol",   color: "#ec4899", tasks: 4 },
  ];

  const tasks = [
    { text: "Wireframes for homepage",     done: true,  assignee: members[0], mine: false },
    { text: "Design system tokens",         done: true,  assignee: members[0], mine: false },
    { text: "Develop header component",     done: false, assignee: members[2], mine: true  },
    { text: "Integrate payment flow",       done: false, assignee: members[1], mine: false },
    { text: "Client review session",        done: false, assignee: null,       mine: false },
  ];

  const projects = [
    { name: "Website Redesign", client: "Acme Corp",    color: COLORS.blue,   pct: 40, active: true  },
    { name: "Mobile App",       client: "TechStart",    color: COLORS.green,  pct: 72, active: true  },
    { name: "Branding",         client: "Studio Nine",  color: COLORS.purple, pct: 15, active: false },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/80 bg-white">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="w-3 h-3 rounded-full bg-red-400/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <div className="w-3 h-3 rounded-full bg-green-400/70" />
        <div className="ml-3 h-5 rounded bg-white border border-slate-200 flex items-center gap-1.5 px-3 w-48">
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <div className="h-1.5 rounded bg-slate-200 w-28" />
        </div>
      </div>

      <div className="flex" style={{ height: 380 }}>
        {/* Dark blue sidebar */}
        <div className="w-44 shrink-0 flex flex-col p-3 gap-0.5" style={{ background: "#1e2a3b" }}>
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-white rounded-sm" />
            </div>
            <span className="text-[11px] font-bold text-white">Team<span className="text-blue-400">Flow</span></span>
          </div>
          <div className="text-[9px] font-semibold text-white/30 uppercase tracking-wide px-2 mb-1">Projects</div>
          {projects.map((p, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] ${i === 0 ? "bg-blue-600 text-white" : "text-white/40"}`}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? "white" : p.color }} />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
          <div className="mt-auto pt-2 border-t border-white/8">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">AL</div>
              <div>
                <div className="text-[9px] font-medium text-white/80">Alice</div>
                <div className="text-[8px] text-white/30">Manager</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* Project header */}
          <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-0">
            <div className="h-1 w-full rounded-t-sm mb-3" style={{ background: COLORS.blue, marginTop: -12, marginLeft: -16, width: "calc(100% + 32px)" }} />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.blue }} />
                <span className="text-xs font-bold text-slate-900">Website Redesign</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">Active</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">Due May 30</span>
                <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">3 members</span>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                <span>2 of 5 tasks</span><span>40%</span>
              </div>
              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "40%", background: COLORS.blue }} />
              </div>
            </div>
            {/* Tab bar */}
            <div className="flex gap-3">
              {["Tasks", "Time", "Team", "Portal"].map((tab, i) => (
                <div key={tab} className={`text-[9px] font-medium pb-1.5 border-b-2 ${i === 0 ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400"}`}>{tab}</div>
              ))}
            </div>
          </div>

          {/* Task list + team sidebar */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-3 overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Design</span>
                <span className="text-[8px] text-slate-300">2/2</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              {tasks.slice(0, 3).map((task, i) => (
                <div key={i} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg mb-0.5 ${task.mine ? "bg-blue-50" : "hover:bg-slate-50"} ${!task.assignee ? "bg-orange-50" : ""}`}>
                  {task.done
                    ? <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 8 8" className="w-2 h-2 text-white"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                      </div>
                    : <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${task.mine ? "border-blue-400" : "border-slate-200"}`} />
                  }
                  <span className={`text-[10px] flex-1 ${task.done ? "line-through text-slate-300" : task.mine ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                    {task.text}
                  </span>
                  {task.assignee && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0" style={{ backgroundColor: task.assignee.color }}>
                      {task.assignee.initials[0]}
                    </div>
                  )}
                  {!task.assignee && (
                    <span className="text-[8px] text-orange-500 font-medium">No assignee</span>
                  )}
                </div>
              ))}
              <div className="mt-2 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Development</span>
                  <span className="text-[8px] text-slate-300">0/2</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                {tasks.slice(3).map((task, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-0.5">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 shrink-0" />
                    <span className="text-[10px] text-slate-500 flex-1">{task.text}</span>
                    {task.assignee && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0" style={{ backgroundColor: task.assignee.color }}>
                        {task.assignee.initials[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Team sidebar */}
            <div className="w-28 shrink-0 border-l border-slate-100 bg-white p-3">
              <div className="text-[8px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Team</div>
              {members.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</div>
                  <div>
                    <div className="text-[9px] font-medium text-slate-700">{m.name}</div>
                    <div className="text-[8px] text-slate-400">{m.tasks} tasks</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Project cards preview ────────────────────────────────────────────────────

function ProjectCardsMockup() {
  const projects = [
    { name: "Website Redesign", client: "Acme Corp",   color: COLORS.blue,   pct: 40, open: 3, members: 3, dueLabel: "May 30" },
    { name: "Mobile App",       client: "TechStart",   color: COLORS.green,  pct: 72, open: 1, members: 4, dueLabel: "Jun 15" },
    { name: "Brand Identity",   client: "Studio Nine", color: COLORS.purple, pct: 15, open: 8, members: 2, dueLabel: "Apr 20", late: true },
    { name: "E-commerce",       client: "ShopCo",      color: COLORS.orange, pct: 58, open: 2, members: 3, dueLabel: "Jul 1" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {projects.map((p, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: p.color }} />
          <div className="p-3">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-semibold text-slate-800 leading-tight">{p.name}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-0.5" />
            </div>
            <div className="text-[9px] text-slate-400 mb-2">{p.client}</div>
            <div className="mb-2">
              <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
                <span>{p.pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-400">
              <span>{p.open} open</span>
              <span>·</span>
              <span>{p.members} members</span>
              <span className={`ml-auto ${p.late ? "text-red-400" : ""}`}>{p.late ? "2d late" : p.dueLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: ListChecks,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    title: "Todo list with accountability",
    description: "Assign tasks to multiple people. Each person marks their own part done. Task completes only when everyone is finished — no more dropped balls.",
  },
  {
    icon: Clock,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "Time tracking & budget",
    description: "Start/stop timers on any task. Hourly rates per member. Auto-calculated budget burn with alerts at 80% and 100% — before surprises hit.",
  },
  {
    icon: Globe,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    title: "Client Portal",
    description: "One link, no login needed. Clients see live progress, task statuses, deadlines, and can submit requests you convert to tasks in one click.",
  },
  {
    icon: Bot,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-100",
    title: "AI Project Plan",
    description: "Describe your project in plain text. Claude generates a full task plan with sections, priorities, and assignees. Apply everything in one click.",
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = [
  { num: "1", title: "Create your workspace", desc: "Set up your agency workspace, invite your team, and set hourly rates. Takes under 5 minutes." },
  { num: "2", title: "Add your team & projects", desc: "Create client projects, assign members, organize tasks into sections. Start from a template." },
  { num: "3", title: "Deliver for clients", desc: "Track progress, log time, share the client portal. AI generates weekly status reports automatically." },
];

// ─── Pricing ──────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Free",
    price: 0,
    desc: "For solo freelancers getting started.",
    features: ["1 project", "Up to 3 members", "Tasks & time tracking", "Comments & archive"],
    cta: "Get started free",
    popular: false,
  },
  {
    name: "Studio",
    price: 29,
    desc: "For small agencies running client work.",
    features: ["Unlimited projects", "Up to 10 members", "Client Portal", "AI Plan & Analysis", "Budget tracking", "Telegram + email alerts", "Project templates"],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Agency",
    price: 59,
    desc: "For larger studios, multiple clients.",
    features: ["Everything in Studio", "Up to 25 members", "White-label Client Portal", "Priority support", "AI weekly reports", "Advanced archive & PDF export"],
    cta: "Get started",
    popular: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-white">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Project management built for client work
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] text-slate-900 mb-5">
              The agency PM tool your<br className="hidden sm:block" />
              <span className="text-blue-600"> team will actually use</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
              Tasks, time tracking, client portal, and AI analysis — all in one place. No integrations. No corporate chaos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Button asChild size="lg" className="text-base px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                <Link href="/register">
                  Get started free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 border-slate-200 text-slate-700 hover:bg-slate-50">
                <Link href="/#features">See features</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-400">No credit card required · Free plan forever</p>
          </div>

          {/* Full dashboard mockup */}
          <DashboardMockup />
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-7">
            Trusted by 1,000+ digital agencies worldwide
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: "1,000+", label: "Active workspaces" },
              { value: "50k+",   label: "Tasks completed"   },
              { value: "98%",    label: "Client satisfaction"},
              { value: "4.9★",   label: "Average rating"    },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-slate-900">{value}</div>
                <div className="text-sm text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECT CARDS PREVIEW ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium mb-5">
                Dashboard
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                All your projects at a glance
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                See every project's progress, deadlines, and team load on one screen. Each project gets its own color for instant recognition.
              </p>
              <ul className="space-y-3">
                {[
                  "Color-coded project cards with live progress bars",
                  "Open task count and team member badges",
                  "Deadline indicators — green, amber, or overdue red",
                  "One click to open any project",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <ProjectCardsMockup />
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-medium mb-4">
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Everything in one place. Nothing you don't need.
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Built specifically for agencies managing client projects — not a generic tool adapted for agencies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, color, bg, border, title, description }) => (
              <div key={title} className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCOUNTABILITY HIGHLIGHT ──────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium mb-5">
                <Users className="w-3.5 h-3.5" />
                Team accountability
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">
                No more "I thought you handled it"
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                Multi-assignee tasks with per-person completion. The task only closes when <strong className="text-slate-800">everyone</strong> checks off — with a live progress indicator visible to the whole team.
              </p>
              <ul className="space-y-3">
                {[
                  "Assign one task to multiple people",
                  "Each person marks their own part done",
                  "Live indicator: ✓ Alice · ○ Boris · ○ Victor",
                  "PM notified when the last person completes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Task mini mockup */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Development</div>
              {[
                {
                  text: "Setup CI/CD pipeline",
                  assignees: [
                    { init: "AL", color: "#3b82f6", done: true },
                    { init: "BO", color: "#a855f7", done: true },
                  ],
                  status: "done",
                },
                {
                  text: "Integrate payment gateway",
                  assignees: [
                    { init: "AL", color: "#3b82f6", done: true },
                    { init: "CA", color: "#ec4899", done: false },
                    { init: "BO", color: "#a855f7", done: false },
                  ],
                  status: "partial",
                },
                {
                  text: "Write API documentation",
                  assignees: [{ init: "CA", color: "#ec4899", done: false }],
                  status: "open",
                },
                {
                  text: "Deploy to staging",
                  assignees: [],
                  status: "noassignee",
                },
              ].map((task, i) => (
                <div key={i} className="mb-3">
                  <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border ${task.status === "noassignee" ? "bg-orange-50 border-orange-100" : "bg-white border-slate-200"}`}>
                    {task.status === "done"
                      ? <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-white"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                        </div>
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                    <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {task.text}
                    </span>
                    {task.assignees.length > 0 ? (
                      <div className="flex -space-x-1">
                        {task.assignees.map((a, j) => (
                          <div key={j} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white" style={{ backgroundColor: a.color, opacity: a.done ? 1 : 0.35 }}>
                            {a.init[0]}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                        <UserX className="w-3.5 h-3.5" />
                        No assignee
                      </div>
                    )}
                  </div>
                  {task.status === "partial" && (
                    <div className="flex items-center gap-2 mt-1.5 ml-3 text-xs text-slate-400">
                      {task.assignees.map((a, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {a.done
                            ? <Check className="w-3 h-3 text-emerald-500" />
                            : <Circle className="w-3 h-3" />}
                          {a.init}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-medium mb-4">
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-sm shadow-blue-500/20">
                  <span className="text-base font-bold text-white">{num}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium mb-4">
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-500 text-lg">
              Start free. Upgrade when your team grows. Save 20% with annual billing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map(({ name, price, desc, features, cta, popular }) => (
              <div
                key={name}
                className={`relative flex flex-col rounded-xl border p-6 ${
                  popular
                    ? "border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
                    : "border-slate-200 shadow-sm"
                } bg-white`}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-semibold text-slate-900 mb-1">{name}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>

                <div className="mb-5">
                  {price === 0 ? (
                    <span className="text-4xl font-bold text-slate-900">Free</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-slate-900">${price}</span>
                      <span className="text-slate-500 mb-1 text-sm">/month</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${popular ? "text-blue-600" : "text-emerald-500"}`} strokeWidth={2.5} />
                      <span className="text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full ${popular ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : ""}`}
                  variant={popular ? "default" : "outline"}
                >
                  <Link href="/register">
                    {cta}
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            All plans include a 14-day free trial. No credit card required.{" "}
            <Link href="/pricing" className="underline underline-offset-4 hover:text-slate-700 transition-colors">
              Compare all features →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 border-t border-slate-200">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-6 shadow-lg shadow-blue-500/30">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Ready to run your agency like a well-oiled machine?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Join 1,000+ agencies already using TeamFlow to deliver projects on time and on budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="text-base px-8 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30">
              <Link href="/register">
                Get started free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600">
              <Link href="/#pricing">View pricing</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required · Cancel anytime</p>
        </div>
      </section>

    </div>
  );
}
