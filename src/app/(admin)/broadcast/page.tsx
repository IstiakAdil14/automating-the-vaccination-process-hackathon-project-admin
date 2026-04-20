"use client";

import { useState, useTransition } from "react";
import { Megaphone, Clock, History, Loader2, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { MessageComposer }       from "@/components/admin/broadcast/MessageComposer";
import { AudienceBuilder }       from "@/components/admin/broadcast/AudienceBuilder";
import { SchedulePanel, type ScheduleConfig } from "@/components/admin/broadcast/SchedulePanel";
import { RecipientPreview }      from "@/components/admin/broadcast/RecipientPreview";
import { BroadcastHistoryTable } from "@/components/admin/broadcast/BroadcastHistoryTable";
import {
  sendBroadcast, scheduleBroadcast,
  type BroadcastAudience, type BroadcastPayload,
} from "@/app/actions/broadcast";

const DEFAULT_AUDIENCE: BroadcastAudience = {
  roles: [], divisions: [], districts: [],
};

const DEFAULT_SCHEDULE: ScheduleConfig = { mode: "now" };

export default function BroadcastPage() {
  // Composer state
  const [title,         setTitle]         = useState("");
  const [channels,      setChannels]      = useState<string[]>(["IN_APP"]);
  const [smsBody,       setSmsBody]       = useState("");
  const [emailSubject,  setEmailSubject]  = useState("");
  const [emailHtml,     setEmailHtml]     = useState("");
  const [inAppBody,     setInAppBody]     = useState("");
  const [audience,      setAudience]      = useState<BroadcastAudience>(DEFAULT_AUDIENCE);
  const [schedule,      setSchedule]      = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [totalCount,    setTotalCount]    = useState(0);

  // Send state
  const [result,     setResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending,  startTransition] = useTransition();
  const [activeTab,  setActiveTab]  = useState("compose");

  function resetComposer() {
    setTitle(""); setChannels(["IN_APP"]); setSmsBody(""); setEmailSubject("");
    setEmailHtml(""); setInAppBody(""); setAudience(DEFAULT_AUDIENCE); setSchedule(DEFAULT_SCHEDULE);
    setResult(null);
  }

  function handleResend(partial: Partial<BroadcastPayload>) {
    if (partial.title)    setTitle(partial.title);
    if (partial.channels) setChannels(partial.channels);
    setActiveTab("compose");
  }

  function validate(): string | null {
    if (!title.trim())          return "Title is required";
    if (channels.length === 0)  return "Select at least one channel";
    if (channels.includes("SMS")    && !smsBody.trim())    return "SMS body is required";
    if (channels.includes("EMAIL")  && !emailSubject.trim()) return "Email subject is required";
    if (channels.includes("EMAIL")  && !emailHtml.trim())  return "Email body is required";
    if (channels.includes("IN_APP") && !inAppBody.trim())  return "In-App body is required";
    return null;
  }

  function handleSend() {
    const err = validate();
    if (err) { setResult({ ok: false, message: err }); return; }
    setResult(null);

    const payload: BroadcastPayload = {
      title, channels, smsBody, emailSubject, emailHtml, inAppBody, audience,
    };

    startTransition(async () => {
      let res;
      if (schedule.mode === "scheduled" && schedule.sendAt) {
        res = await scheduleBroadcast(payload, {
          sendAt:    schedule.sendAt,
          recurring: schedule.recurring,
          weekDays:  schedule.weekDays,
        });
      } else {
        res = await sendBroadcast(payload);
      }

      if (res.ok) {
        setResult({ ok: true, message: schedule.mode === "scheduled" ? "Broadcast scheduled successfully!" : "Broadcast sent successfully!" });
        setTimeout(() => { resetComposer(); setActiveTab("history"); }, 2000);
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  const canSend = title.trim() && channels.length > 0 && !isPending;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Broadcast System"
        description="Send nationwide announcements to citizens, staff, and admins"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-2 h-auto flex-wrap gap-1 bg-transparent p-0">
          {[
            { value: "compose",  label: "New Broadcast", icon: Megaphone },
            { value: "scheduled",label: "Scheduled",     icon: Clock },
            { value: "history",  label: "History",       icon: History },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-all data-[state=active]:border-[var(--border)] data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* -- Compose -- */}
        <TabsContent value="compose" className="mt-4">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            {/* Left: composer + schedule + preview */}
            <div className="flex flex-col gap-6">
              <MessageComposer
                title={title}             onTitleChange={setTitle}
                channels={channels}       onChannelsChange={setChannels}
                smsBody={smsBody}         onSmsChange={setSmsBody}
                emailSubject={emailSubject} onEmailSubjectChange={setEmailSubject}
                emailHtml={emailHtml}     onEmailHtmlChange={setEmailHtml}
                inAppBody={inAppBody}     onInAppChange={setInAppBody}
                estimatedRecipients={totalCount}
              />

              <SchedulePanel value={schedule} onChange={setSchedule} />

              <RecipientPreview
                audience={audience}
                channels={channels}
                totalCount={totalCount}
              />

              {/* Result banner */}
              {result && (
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${result.ok ? "border-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--danger)] bg-[var(--danger-subtle)]"}`}>
                  {result.ok
                    ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[var(--accent)]" />
                    : <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />}
                  <p className={`text-sm font-medium ${result.ok ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                    {result.message}
                  </p>
                </div>
              )}

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={!canSend}
                className="w-full bg-[var(--accent)] text-white hover:opacity-90"
                size="lg"
              >
                {isPending
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending-</>
                  : schedule.mode === "scheduled"
                    ? <><Clock className="h-5 w-5" /> Schedule Broadcast</>
                    : <><Send className="h-5 w-5" /> Send Broadcast Now</>}
              </Button>
            </div>

            {/* Right: audience builder */}
            <div>
              <AudienceBuilder
                audience={audience}
                onChange={(a) => { setAudience(a); }}
                onTestSend={() => {
                  // Send to test account only
                  startTransition(async () => {
                    await sendBroadcast({
                      title: `[TEST] ${title}`, channels, smsBody, emailSubject, emailHtml, inAppBody,
                      audience: { roles: ["ADMIN"], divisions: [], districts: [] },
                    });
                    setResult({ ok: true, message: "Test send dispatched to admin account" });
                  });
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* -- Scheduled -- */}
        <TabsContent value="scheduled" className="mt-4">
          <BroadcastHistoryTable onResend={handleResend} />
        </TabsContent>

        {/* -- History -- */}
        <TabsContent value="history" className="mt-4">
          <BroadcastHistoryTable onResend={handleResend} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
