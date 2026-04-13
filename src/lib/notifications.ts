// src/lib/notifications.ts
// Notification helpers: Telegram + Email transactional
// All functions are fire-and-forget — they never throw to avoid blocking API responses.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@teamflow.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Telegram ────────────────────────────────────────────────

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // silent
  }
}

// ─── Email ───────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch {
    // silent
  }
}

function emailHtml(title: string, body: string, cta?: { href: string; label: string }): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 12px">${title}</h2>
      <p style="color:#555;margin:0 0 20px">${body}</p>
      ${cta ? `<a href="${cta.href}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a>` : ""}
      <p style="color:#aaa;font-size:12px;margin-top:32px">TeamFlow · <a href="${APP_URL}" style="color:#aaa">${APP_URL}</a></p>
    </div>`;
}

// ─── Notification targets ────────────────────────────────────

interface NotifyTarget {
  name: string;
  email: string;
  telegramChatId: string | null;
}

async function notify(target: NotifyTarget, subject: string, message: string, cta?: { href: string; label: string }) {
  const promises: Promise<void>[] = [];
  if (target.telegramChatId) {
    promises.push(sendTelegram(target.telegramChatId, message));
  } else if (target.email) {
    // email fallback when no Telegram
    promises.push(sendEmail(target.email, subject, emailHtml(subject, message, cta)));
  }
  await Promise.all(promises);
}

// ─── Public notification functions ───────────────────────────

/**
 * Called when a task is created with assignees.
 * Notifies each assignee (except the creator).
 */
export async function notifyTaskAssigned({
  assigneeIds,
  taskText,
  projectName,
  projectId,
  assignedByName,
}: {
  assigneeIds: string[];
  taskText: string;
  projectName: string;
  projectId: string;
  assignedByName: string;
}) {
  if (!assigneeIds.length) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const members = await prisma.workspaceMember.findMany({
      where: { id: { in: assigneeIds } },
      select: { name: true, email: true, telegramChatId: true },
    });
    const taskUrl = `${APP_URL}/dashboard/projects/${projectId}`;
    await Promise.all(
      members.map((m) =>
        notify(
          m,
          `New task assigned: ${taskText}`,
          `<b>${assignedByName}</b> assigned you a task in <b>${projectName}</b>:\n\n"${taskText}"`,
          { href: taskUrl, label: "Open project" }
        )
      )
    );
  } catch {
    // silent
  }
}

/**
 * Called when ALL assignees mark a task done.
 * Notifies all project managers.
 */
export async function notifyTaskCompleted({
  taskText,
  projectId,
  projectName,
  managerIds,
  completedByName,
}: {
  taskText: string;
  projectId: string;
  projectName: string;
  managerIds: string[];
  completedByName: string;
}) {
  if (!managerIds.length) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const members = await prisma.workspaceMember.findMany({
      where: { id: { in: managerIds } },
      select: { name: true, email: true, telegramChatId: true },
    });
    const taskUrl = `${APP_URL}/dashboard/projects/${projectId}`;
    await Promise.all(
      members.map((m) =>
        notify(
          m,
          `Task completed: ${taskText}`,
          `✅ <b>${completedByName}</b> completed the last step in <b>${projectName}</b>:\n\n"${taskText}"`,
          { href: taskUrl, label: "Open project" }
        )
      )
    );
  } catch {
    // silent
  }
}

/**
 * Called when a comment is posted.
 * Notifies task assignees (except the commenter).
 */
export async function notifyNewComment({
  taskText,
  projectId,
  projectName,
  assigneeIds,
  commenterWsMemberId,
  commenterName,
  commentText,
}: {
  taskText: string;
  projectId: string;
  projectName: string;
  assigneeIds: string[];
  commenterWsMemberId: string;
  commenterName: string;
  commentText: string;
}) {
  const othersIds = assigneeIds.filter((id) => id !== commenterWsMemberId);
  if (!othersIds.length) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const members = await prisma.workspaceMember.findMany({
      where: { id: { in: othersIds } },
      select: { name: true, email: true, telegramChatId: true },
    });
    const taskUrl = `${APP_URL}/dashboard/projects/${projectId}`;
    const preview = commentText.length > 80 ? commentText.slice(0, 80) + "…" : commentText;
    await Promise.all(
      members.map((m) =>
        notify(
          m,
          `New comment on "${taskText}"`,
          `<b>${commenterName}</b> commented on <b>${taskText}</b> in <b>${projectName}</b>:\n\n"${preview}"`,
          { href: taskUrl, label: "View comment" }
        )
      )
    );
  } catch {
    // silent
  }
}

/**
 * Called when a task's last assignee is removed and it becomes unassigned.
 * Notifies all project managers.
 */
export async function notifyTaskUnassigned({
  taskText,
  projectId,
  projectName,
  managerIds,
}: {
  taskText: string;
  projectId: string;
  projectName: string;
  managerIds: string[];
}) {
  if (!managerIds.length) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const members = await prisma.workspaceMember.findMany({
      where: { id: { in: managerIds } },
      select: { name: true, email: true, telegramChatId: true },
    });
    const taskUrl = `${APP_URL}/dashboard/projects/${projectId}`;
    await Promise.all(
      members.map((m) =>
        notify(
          m,
          `Task needs assignee: ${taskText}`,
          `⚠️ Task <b>"${taskText}"</b> in <b>${projectName}</b> has no assignees and needs attention.`,
          { href: taskUrl, label: "Open project" }
        )
      )
    );
  } catch {
    // silent
  }
}
