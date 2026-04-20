"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateCenter } from "@/app/actions/centers";
import { CenterEditSchema, type CenterEditInput } from "@/lib/schemas/center";
import type { Center } from "@/types";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

interface Props {
  center:  Center;
  open:    boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CenterEditDialog({ center, open, onClose, onSaved }: Props) {
  const [serverError, setServerError] = useState("");
  const [isPending,   startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CenterEditInput>({
    resolver: zodResolver(CenterEditSchema),
    defaultValues: {
      name:          center.name,
      licenseNo:     center.licenseNo,
      type:          center.type,
      geoLat:        center.geoLat,
      geoLng:        center.geoLng,
      dailyCapacity: center.dailyCapacity,
      address:       center.address,
      contact:       center.contact,
      operatingHours: center.operatingHours ?? [],
    },
  });

  const hours = watch("operatingHours") ?? [];

  function addHour() {
    setValue("operatingHours", [...hours, { day: 0, morningStart: "", morningEnd: "", eveningStart: "", eveningEnd: "" }]);
  }

  function removeHour(i: number) {
    setValue("operatingHours", hours.filter((_, idx) => idx !== i));
  }

  function onSubmit(data: CenterEditInput) {
    setServerError("");
    startTransition(async () => {
      const res = await updateCenter(center._id, data);
      if (!res.ok) { setServerError(res.error); return; }
      onSaved();
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Center - {center.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-5">

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Center Name" error={errors.name?.message}>
                <Input {...register("name")} className={cn(errors.name && "border-[var(--danger)]")} />
              </Field>
              <Field label="License No." error={errors.licenseNo?.message}>
                <Input {...register("licenseNo")} className={cn(errors.licenseNo && "border-[var(--danger)]")} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Center Type" error={errors.type?.message}>
                <Select defaultValue={center.type} onValueChange={(v) => setValue("type", v as CenterEditInput["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["GOVT_HOSPITAL","PRIVATE_CLINIC","COMMUNITY","MOBILE"] as const).map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Daily Capacity" error={errors.dailyCapacity?.message}>
                <Input type="number" {...register("dailyCapacity", { valueAsNumber: true })} />
              </Field>
            </div>

            {/* Address */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Address</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Division" error={errors.address?.division?.message}>
                  <Select defaultValue={center.address.division} onValueChange={(v) => setValue("address.division", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="District" error={errors.address?.district?.message}>
                  <Input {...register("address.district")} />
                </Field>
                <Field label="Upazila" error={errors.address?.upazila?.message}>
                  <Input {...register("address.upazila")} />
                </Field>
                <Field label="Full Address" error={errors.address?.full?.message}>
                  <Input {...register("address.full")} />
                </Field>
              </div>
            </div>

            {/* Geo */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" error={errors.geoLat?.message}>
                <Input type="number" step="0.000001" {...register("geoLat", { valueAsNumber: true })} />
              </Field>
              <Field label="Longitude" error={errors.geoLng?.message}>
                <Input type="number" step="0.000001" {...register("geoLng", { valueAsNumber: true })} />
              </Field>
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Contact</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Name" error={errors.contact?.name?.message}>
                  <Input {...register("contact.name")} />
                </Field>
                <Field label="Phone" error={errors.contact?.phone?.message}>
                  <Input {...register("contact.phone")} />
                </Field>
                <Field label="Email" error={errors.contact?.email?.message}>
                  <Input type="email" {...register("contact.email")} />
                </Field>
              </div>
            </div>

            {/* Operating hours */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Operating Hours</p>
                <Button type="button" size="sm" variant="outline" onClick={addHour}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {hours.map((h, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_32px] items-center gap-2">
                  <Select
                    defaultValue={String(h.day)}
                    onValueChange={(v) => {
                      const updated = [...hours];
                      updated[i] = { ...updated[i], day: Number(v) };
                      setValue("operatingHours", updated);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d.slice(0,3)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(["morningStart","morningEnd","eveningStart","eveningEnd"] as const).map((field) => (
                    <Input
                      key={field}
                      type="time"
                      className="h-8 text-xs"
                      {...register(`operatingHours.${i}.${field}`)}
                    />
                  ))}
                  <button type="button" onClick={() => removeHour(i)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {serverError && <p className="text-sm text-[var(--danger)]">{serverError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
