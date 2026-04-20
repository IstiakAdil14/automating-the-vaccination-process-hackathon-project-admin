"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mail, Bell, Layers, DollarSign, Bold, List, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SMS_COST_PER_SEGMENT = 0.0075; // USD per 160-char segment

type Channel = "SMS" | "EMAIL" | "IN_APP" | "ALL";

interface Props {
  title:         string;
  onTitleChange: (v: string) => void;
  channels:      string[];
  onChannelsChange: (v: string[]) => void;
  smsBody:       string;
  onSmsChange:   (v: string) => void;
  emailSubject:  string;
  onEmailSubjectChange: (v: string) => void;
  emailHtml:     string;
  onEmailHtmlChange: (v: string) => void;
  inAppBody:     string;
  onInAppChange: (v: string) => void;
  estimatedRecipients: number;
}

import type { ElementType } from "react";

const CHANNEL_TABS: { id: Channel; label: string; icon: ElementType }[] = [
  { id: "SMS",    label: "SMS",      icon: MessageSquare },
  { id: "EMAIL",  label: "Email",    icon: Mail },
  { id: "IN_APP", label: "In-App",   icon: Bell },
  { id: "ALL",    label: "All Channels", icon: Layers },
];

function smsSegments(text: string) {
  return Math.max(1, Math.ceil(text.length / 160));
}

/* --- Minimal rich-text toolbar for email (no TipTap dep - uses execCommand) -- */
function EmailToolbar() {
  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
  }
  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2">
      {[
        { icon: Bold,  cmd: "bold",        title: "Bold" },
        { icon: List,  cmd: "insertUnorderedList", title: "List" },
      ].map(({ icon: Icon, cmd, title }) => (
        <button
          key={cmd}
          type="button"
          title={title}
          onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
          className="rounded p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <button
        type="button"
        title="Link"
        onMouseDown={(e) => {
          e.preventDefault();
          const url = prompt("Enter URL");
          if (url) exec("createLink", url);
        }}
        className="rounded p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MessageComposer({
  title, onTitleChange,
  channels, onChannelsChange,
  smsBody, onSmsChange,
  emailSubject, onEmailSubjectChange,
  emailHtml, onEmailHtmlChange,
  inAppBody, onInAppChange,
  estimatedRecipients,
}: Props) {
  const [activeTab,    setActiveTab]    = useState<Channel>("SMS");
  const [inAppPreview, setInAppPreview] = useState(false);

  function toggleChannel(ch: string) {
    if (ch === "ALL") {
      const all = ["SMS","EMAIL","IN_APP"];
      const hasAll = all.every((c) => channels.includes(c));
      onChannelsChange(hasAll ? [] : all);
      return;
    }
    const next = channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch];
    onChannelsChange(next);
  }

  const segments = smsSegments(smsBody);
  const smsCost  = (segments * estimatedRecipients * SMS_COST_PER_SEGMENT).toFixed(2);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">Message Composer</p>

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Broadcast Title *
        </label>
        <Input
          placeholder="e.g. COVID-19 Booster Drive Reminder"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Channel selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Channels
        </label>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_TABS.map(({ id, label, icon: Icon }) => {
            const isAll     = id === "ALL";
            const allActive = ["SMS","EMAIL","IN_APP"].every((c) => channels.includes(c));
            const active    = isAll ? allActive : channels.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => { toggleChannel(id); if (!isAll) setActiveTab(id); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {(["SMS","EMAIL","IN_APP"] as Channel[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2 text-xs font-semibold transition-colors",
              activeTab === tab
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            {tab === "IN_APP" ? "In-App" : tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "SMS" && (
          <motion.div
            key="sms"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="relative">
              <textarea
                value={smsBody}
                onChange={(e) => onSmsChange(e.target.value)}
                rows={5}
                maxLength={1600}
                placeholder="Write your SMS message (160 chars = 1 SMS)-"
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] text-[var(--foreground-muted)]">
                <span className={cn(smsBody.length > 160 ? "text-[var(--warning)]" : "")}>{smsBody.length}/160</span>
                {segments > 1 && <span className="rounded-full bg-[var(--warning-subtle)] px-1.5 py-0.5 text-[var(--warning)]">{segments} SMS</span>}
              </div>
            </div>

            {/* Cost estimate */}
            {estimatedRecipients > 0 && smsBody.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] px-4 py-3">
                <DollarSign className="h-4 w-4 text-[var(--foreground-muted)]" />
                <p className="text-xs text-[var(--foreground-muted)]">
                  Estimated cost: <strong className="text-[var(--foreground)]">${smsCost} USD</strong>
                  <span className="ml-1">({segments} segment{segments > 1 ? "s" : ""} - {estimatedRecipients.toLocaleString()} recipients)</span>
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "EMAIL" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <Input
              placeholder="Email subject line-"
              value={emailSubject}
              onChange={(e) => onEmailSubjectChange(e.target.value)}
              maxLength={200}
            />
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <EmailToolbar />
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onEmailHtmlChange((e.target as HTMLDivElement).innerHTML)}
                dangerouslySetInnerHTML={{ __html: emailHtml }}
                className="min-h-[160px] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none"
                data-placeholder="Write your email body here-"
              />
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Supports bold, lists, and links. HTML will be sent via SendGrid.
            </p>
          </motion.div>
        )}

        {activeTab === "IN_APP" && (
          <motion.div
            key="inapp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--foreground-muted)]">Markdown supported</p>
              <button
                type="button"
                onClick={() => setInAppPreview((p) => !p)}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {inAppPreview ? "Edit" : "Preview"}
              </button>
            </div>
            {inAppPreview ? (
              <div
                className="min-h-[120px] rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] px-4 py-3 text-sm text-[var(--foreground)] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: inAppBody.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }}
              />
            ) : (
              <textarea
                value={inAppBody}
                onChange={(e) => onInAppChange(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Write your in-app notification body (Markdown supported)-"
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none font-mono"
              />
            )}
            <p className="text-right text-[10px] text-[var(--foreground-muted)]">{inAppBody.length}/2000</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
