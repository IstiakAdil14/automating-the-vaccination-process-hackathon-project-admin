"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Loader2, User, Briefcase, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createStaff } from "@/app/actions/staff";
import { CreateStaffSchema, type CreateStaffInput } from "@/lib/schemas/staff";

/* --- Center search hook ------------------------------------------------------- */
function useCenterSearch() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<{ _id: string; name: string; address: { division: string } }[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const res  = await fetch(`/api/admin/centers?search=${encodeURIComponent(q)}&limit=8&status=ACTIVE`);
    const json = await res.json();
    setResults(json.data ?? []);
    setLoading(false);
  }

  return { query, results, loading, search, setResults };
}

/* --- Step indicator ----------------------------------------------------------- */
const STEPS = [
  { label: "Personal Info",    icon: User },
  { label: "Role & Assignment", icon: Briefcase },
  { label: "Review & Create",  icon: ClipboardCheck },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)]">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
              done   ? "bg-[var(--accent)] text-white" :
              active ? "bg-[var(--primary)] text-white" :
                       "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
            )}>
              {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", active ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-subtle)] mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

/* --- CreateStaffDialog -------------------------------------------------------- */
interface Props { open: boolean; onClose: () => void; onCreated: () => void }

export function CreateStaffDialog({ open, onClose, onCreated }: Props) {
  const [step,        setStep]        = useState(0);
  const [serverError, setServerError] = useState("");
  const [isPending,   startTransition] = useTransition();
  const centerSearch = useCenterSearch();
  const [selectedCenter, setSelectedCenter] = useState<{ _id: string; name: string; address: { division: string } } | null>(null);

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<CreateStaffInput>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: { role: "VACCINATOR", shift: "morning", sendCredentials: true },
  });

  const watched = watch();

  async function nextStep() {
    const fields: (keyof CreateStaffInput)[][] = [
      ["name", "nid", "phone", "email", "dateOfBirth"],
      ["role", "centerId", "shift"],
    ];
    const valid = await trigger(fields[step]);
    if (valid) setStep((s) => s + 1);
  }

  function onSubmit(data: CreateStaffInput) {
    setServerError("");
    startTransition(async () => {
      const res = await createStaff(data);
      if (!res.ok) { setServerError(res.error); return; }
      setStep(0);
      onCreated();
    });
  }

  function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</label>
        {children}
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setStep(0); onClose(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Staff Account</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="min-h-[320px] px-6 py-5">
            <AnimatePresence mode="wait">
              {/* -- Step 0: Personal Info -- */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" error={errors.name?.message}>
                      <Input {...register("name")} placeholder="Dr. Rahim Uddin" className={cn(errors.name && "border-[var(--danger)]")} />
                    </Field>
                    <Field label="NID" error={errors.nid?.message}>
                      <Input {...register("nid")} placeholder="1234567890" className={cn(errors.nid && "border-[var(--danger)]")} />
                    </Field>
                    <Field label="Phone" error={errors.phone?.message}>
                      <Input {...register("phone")} placeholder="01711000000" className={cn(errors.phone && "border-[var(--danger)]")} />
                    </Field>
                    <Field label="Email" error={errors.email?.message}>
                      <Input type="email" {...register("email")} placeholder="staff@vax.gov.bd" className={cn(errors.email && "border-[var(--danger)]")} />
                    </Field>
                    <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                      <Input type="date" {...register("dateOfBirth")} className={cn(errors.dateOfBirth && "border-[var(--danger)]")} />
                    </Field>
                  </div>
                </motion.div>
              )}

              {/* -- Step 1: Role & Assignment -- */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Role" error={errors.role?.message}>
                      <Select defaultValue="VACCINATOR" onValueChange={(v) => setValue("role", v as CreateStaffInput["role"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["VACCINATOR","RECEPTIONIST","SUPERVISOR"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Shift Preference" error={errors.shift?.message}>
                      <Select defaultValue="morning" onValueChange={(v) => setValue("shift", v as CreateStaffInput["shift"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Center search */}
                  <Field label="Assign to Center" error={errors.centerId?.message}>
                    <div className="relative">
                      <Input
                        placeholder="Search center name-"
                        value={selectedCenter ? selectedCenter.name : centerSearch.query}
                        onChange={(e) => { setSelectedCenter(null); centerSearch.search(e.target.value); }}
                        className={cn(errors.centerId && "border-[var(--danger)]")}
                      />
                      {centerSearch.results.length > 0 && !selectedCenter && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl">
                          {centerSearch.results.map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                setSelectedCenter(c);
                                setValue("centerId", c._id);
                                centerSearch.setResults([]);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--background-subtle)] transition-colors"
                            >
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-[var(--foreground-muted)]">{c.address.division}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                </motion.div>
              )}

              {/* -- Step 2: Review -- */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                    {[
                      { label: "Name",     value: watched.name },
                      { label: "NID",      value: watched.nid },
                      { label: "Email",    value: watched.email },
                      { label: "Phone",    value: watched.phone },
                      { label: "Role",     value: watched.role },
                      { label: "Center",   value: selectedCenter?.name ?? watched.centerId },
                      { label: "Shift",    value: watched.shift },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</span>
                        <span className="text-sm font-medium text-[var(--foreground)]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Send credentials checkbox */}
                  <button
                    type="button"
                    onClick={() => setValue("sendCredentials", !watched.sendCredentials)}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 w-full hover:bg-[var(--background-subtle)] transition-colors"
                  >
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                      watched.sendCredentials ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"
                    )}>
                      {watched.sendCredentials && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-[var(--foreground)]">Send credentials via email</p>
                      <p className="text-xs text-[var(--foreground-muted)]">Staff will receive login details at {watched.email}</p>
                    </div>
                  </button>

                  {serverError && <p className="text-sm text-[var(--danger)]">{serverError}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isPending}>
                Back
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            {step < 2 ? (
              <Button type="button" onClick={nextStep}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Staff
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
