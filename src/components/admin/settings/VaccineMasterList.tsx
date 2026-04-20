"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  getVaccines, createVaccine, updateVaccine,
  type VaccineInput,
} from "@/app/actions/settings";
import { cn } from "@/lib/utils";

/* --- Types -------------------------------------------------------------------- */
interface VaccineRow {
  _id: string;
  vaccineId: string;
  name: string;
  whoCode?: string;
  schedule: { doses: number; intervalDays: number[] };
  ageEligibility: { minYears: number; maxYears?: number };
  contraindications: string[];
  isActive: boolean;
}

/* --- Inline editable cell ----------------------------------------------------- */
function EditableCell({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className="h-7 px-2 py-0 text-xs"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn("cursor-pointer rounded px-1 hover:bg-[var(--background-subtle)]", className)}
    >
      {value || <span className="text-[var(--foreground-subtle)]">-</span>}
    </span>
  );
}

/* --- Add Vaccine Form --------------------------------------------------------- */
function AddVaccineForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [contraInput, setContraInput] = useState("");
  const [form, setForm] = useState<VaccineInput>({
    name: "", shortName: "", whoCode: "", doses: 1,
    intervalDays: [], minAge: 0, maxAge: undefined,
    contraindications: [], manufacturer: "",
  });

  function set<K extends keyof VaccineInput>(k: K, v: VaccineInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addContra() {
    const t = contraInput.trim();
    if (t) { set("contraindications", [...form.contraindications, t]); setContraInput(""); }
  }

  function handleSubmit() {
    if (!form.name || !form.shortName) { setError("Name and short name are required"); return; }
    setError("");
    startTransition(async () => {
      const res = await createVaccine(form);
      if (!res.ok) { setError(res.error ?? "Failed"); return; }
      setOpen(false);
      setForm({ name: "", shortName: "", whoCode: "", doses: 1, intervalDays: [], minAge: 0, contraindications: [], manufacturer: "" });
      onAdded();
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add Vaccine
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">New Vaccine</span>
        <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-xs">Vaccine Name *</label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. BCG Vaccine" className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">Short Name *</label>
          <Input value={form.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="BCG" className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">WHO Code</label>
          <Input value={form.whoCode ?? ""} onChange={(e) => set("whoCode", e.target.value)} placeholder="WHO-BCG-01" className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">Manufacturer</label>
          <Input value={form.manufacturer ?? ""} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Serum Institute" className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">Doses</label>
          <Input type="number" min={1} value={form.doses} onChange={(e) => set("doses", Number(e.target.value))} className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">Interval Days (comma-separated)</label>
          <Input
            placeholder="0,30,180"
            onChange={(e) => set("intervalDays", e.target.value.split(",").map(Number).filter((n) => !isNaN(n)))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="label-xs">Min Age (years)</label>
          <Input type="number" min={0} value={form.minAge} onChange={(e) => set("minAge", Number(e.target.value))} className="h-8 text-xs" />
        </div>
        <div>
          <label className="label-xs">Max Age (years, optional)</label>
          <Input type="number" min={0} value={form.maxAge ?? ""} onChange={(e) => set("maxAge", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" />
        </div>
      </div>

      {/* Contraindications */}
      <div>
        <label className="label-xs">Contraindications</label>
        <div className="flex gap-2">
          <Input
            value={contraInput}
            onChange={(e) => setContraInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addContra()}
            placeholder="Add contraindication-"
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addContra} className="h-8 px-2">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {form.contraindications.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {form.contraindications.map((c, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {c}
                <button onClick={() => set("contraindications", form.contraindications.filter((_, j) => j !== i))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Vaccine
        </Button>
      </div>
    </div>
  );
}

/* --- Main Component ----------------------------------------------------------- */
export function VaccineMasterList() {
  const [vaccines, setVaccines] = useState<VaccineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const res = await getVaccines();
    if (res.ok) setVaccines(res.data as VaccineRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function patch(vaccineId: string, data: Partial<VaccineInput & { isActive: boolean }>) {
    startTransition(async () => {
      await updateVaccine(vaccineId, data);
      await load();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Vaccine Master List</h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            Disabled vaccines are removed from citizen booking flow
          </p>
        </div>
        <AddVaccineForm onAdded={load} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Vaccine Name", "WHO Code", "Schedule", "Age Eligibility", "Contraindications", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {vaccines.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--foreground-muted)]">
                    No vaccines configured
                  </td>
                </tr>
              )}
              {vaccines.map((v) => (
                <tr
                  key={v.vaccineId}
                  className={cn(
                    "transition-colors hover:bg-[var(--background-subtle)]",
                    !v.isActive && "opacity-50"
                  )}
                >
                  <td className="px-3 py-2.5 font-medium">
                    <EditableCell value={v.name} onSave={(val) => patch(v.vaccineId, { name: val })} />
                  </td>
                  <td className="px-3 py-2.5 text-[var(--foreground-muted)]">
                    <EditableCell value={v.whoCode ?? ""} onSave={(val) => patch(v.vaccineId, { whoCode: val })} />
                  </td>
                  <td className="px-3 py-2.5">
                    {v.schedule.doses} dose{v.schedule.doses > 1 ? "s" : ""}
                    {v.schedule.intervalDays.length > 0 && (
                      <span className="text-[var(--foreground-muted)]">
                        {" "}- {v.schedule.intervalDays.join(", ")}d
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {v.ageEligibility.minYears}
                    {v.ageEligibility.maxYears != null ? `-${v.ageEligibility.maxYears}` : "+"} yrs
                  </td>
                  <td className="px-3 py-2.5">
                    {v.contraindications.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {v.contraindications.slice(0, 2).map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                        ))}
                        {v.contraindications.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{v.contraindications.length - 2}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--foreground-subtle)]">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={v.isActive}
                        onCheckedChange={(checked) => patch(v.vaccineId, { isActive: checked })}
                        disabled={isPending}
                      />
                      <span className={v.isActive ? "text-[var(--success)]" : "text-[var(--foreground-muted)]"}>
                        {v.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
