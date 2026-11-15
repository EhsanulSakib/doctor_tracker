"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ROLE_LABELS } from "@/components/layout/user-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, EyeOffIcon, InfoIcon, MailIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { clientFetch } from "@/lib/api/client-fetch";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import type { ApiData, PublicUser } from "@/lib/api/types";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/lib/api/upload";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { userLoaded } from "@/store/slices/auth";

// Mirrors backend/src/modules/auth/auth.schema.ts; the API stays the source of truth. The password
// fields are optional as a group: leave all three empty to keep the current password.
const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").min(2, "Name is too short").max(80, "Name is too long"),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    const changing = !!(v.currentPassword || v.newPassword || v.confirmPassword);
    if (!changing) return;
    if (!v.currentPassword) ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "Enter your current password" });
    if (v.newPassword.length < 8) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Use at least 8 characters" });
    else if (v.newPassword.length > 128) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Use 128 characters or fewer" });
    else if (v.newPassword === v.currentPassword) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password different from the current one" });
    if (v.confirmPassword !== v.newPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match" });
  });

type ProfileValues = z.infer<typeof profileSchema>;

const rise = (index: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT, delay: index * 0.07 },
});

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

/**
 * Account page. Left: the photo (camera button to change it), name, email and role. Right: the name and
 * the password. One Save button applies everything that changed: name, photo, and the password if the
 * password fields are filled in. A new photo is uploaded when picked but only saved on Save.
 */
export function ProfileView({ user }: { user: PublicUser }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [uploading, setUploading] = useState(false);
  // undefined = unchanged; string = new photo (uploaded, not saved yet); null = remove on save.
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined);

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const [name, currentPassword, newPassword, confirmPassword] = useWatch({ control, name: ["name", "currentPassword", "newPassword", "confirmPassword"] });

  const nameChanged = name.trim() !== user.name;
  const avatarChanged = pendingAvatar !== undefined && pendingAvatar !== user.avatarUrl;
  const passwordChanging = !!(currentPassword || newPassword || confirmPassword);
  const dirty = nameChanged || avatarChanged || passwordChanging;
  const shownAvatar = pendingAvatar === undefined ? user.avatarUrl : pendingAvatar;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setPendingAvatar(await uploadImage(file, "avatar"));
    } catch (error) {
      if (!isApiError(error)) throw error;
      if (!isReadOnlyError(error)) toast.error("Couldn't upload the photo", error.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const cancel = () => {
    reset({ name: user.name, currentPassword: "", newPassword: "", confirmPassword: "" });
    setPendingAvatar(undefined);
  };

  const onSubmit = handleSubmit(async (values) => {
    const saved: string[] = [];
    try {
      if (nameChanged || avatarChanged) {
        const body = { ...(nameChanged && { name: values.name.trim() }), ...(avatarChanged && { avatarUrl: pendingAvatar }) };
        const { data } = await clientFetch<ApiData<{ user: PublicUser }>>("/auth/me", { method: "PATCH", body });
        dispatch(userLoaded(data.user));
        if (nameChanged) saved.push("name");
        if (avatarChanged) saved.push("photo");
      }
      if (passwordChanging) {
        await clientFetch("/auth/me/password", { method: "POST", body: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
        saved.push("password");
      }
      reset({ name: values.name.trim(), currentPassword: "", newPassword: "", confirmPassword: "" });
      setPendingAvatar(undefined);
      toast.success("Profile saved", saved.includes("password") ? "Password changed: other devices were signed out." : `Updated your ${saved.join(" and ")}.`);
      // The account menu in the top bar is server-rendered: refresh it.
      router.refresh();
    } catch (error) {
      if (!isApiError(error)) throw error;
      if (saved.length) router.refresh(); // part of it went through (e.g. the name, before a wrong password)
      if (isReadOnlyError(error)) return; // shown as a toast
      const fieldErrors = Object.entries(error.fieldErrors).filter(([field]) => field === "name" || field === "currentPassword" || field === "newPassword");
      for (const [field, message] of fieldErrors) setError(field as keyof ProfileValues, { message }, { shouldFocus: true });
      if (fieldErrors.length === 0) toast.error("Couldn't save your profile", error.message);
    }
  });

  const passwordType = showPasswords ? "text" : "password";

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Left: who you are */}
      <m.div {...rise(0)} className="lg:sticky lg:top-0">
        <Card className="overflow-hidden">
          <div aria-hidden className="h-24 bg-linear-to-br from-accent/35 via-accent/10 to-accent-2/25" />
          <div className="-mt-16 flex flex-col items-center px-5 pb-6 text-center">
            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                <m.span key={shownAvatar ?? "initials"} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="block">
                  <Avatar name={user.name} src={shownAvatar} size={128} className="ring-4 ring-surface" />
                </m.span>
              </AnimatePresence>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-overlay text-white">
                  <Spinner size={22} />
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                aria-label={shownAvatar ? "Change photo" : "Upload photo"}
                data-tooltip={shownAvatar ? "Change photo" : "Upload photo"}
                className="absolute right-1 bottom-1 flex size-9 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-ink shadow-overlay ring-4 ring-surface transition-transform hover:scale-105 focus-ring disabled:cursor-progress"
              >
                <CameraIcon />
              </button>
              <input ref={fileInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </div>

            <p className="mt-4 text-lg font-semibold tracking-tight text-ink">{name.trim() || user.name}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{user.email}</p>
            <p className="mt-1 text-caption font-semibold tracking-wide text-accent-fg uppercase">{ROLE_LABELS[user.role] ?? user.role}</p>

            <AnimatePresence initial={false}>
              {avatarChanged && (
                <m.p key="unsaved" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-caption font-medium text-warning">
                  New photo not saved yet
                </m.p>
              )}
            </AnimatePresence>
            {shownAvatar && (
              <button type="button" onClick={() => setPendingAvatar(null)} className="mt-3 cursor-pointer rounded-sm text-ui text-ink-muted hover:text-danger focus-ring">
                Remove photo
              </button>
            )}
            <p className="mt-2 text-caption text-ink-subtle">JPG, PNG, WebP or GIF · max 5 MB</p>
          </div>
        </Card>
      </m.div>

      {/* Right: what you can change */}
      <m.div {...rise(1)} className="flex min-w-0 flex-col gap-4">
        {user.role === "demo" && (
          <div className="flex items-start gap-2.5 rounded-control border border-info/30 bg-info-soft px-3.5 py-3 text-sm text-ink">
            <InfoIcon size={16} className="mt-0.5 shrink-0 text-info" />
            <span>Demo account: changes here are not saved.</span>
          </div>
        )}

        <Card className="overflow-hidden">
          <Section title="Name">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name?.message}>
                {(p) => <Input {...p} {...register("name")} autoComplete="name" />}
              </Field>
              <Field label="Email">
                {(p) => <Input {...p} value={user.email} readOnly disabled leading={<MailIcon size={15} />} data-tooltip="The email you sign in with can't be changed" />}
              </Field>
            </div>
          </Section>

          <Section title="Password" divider>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current password" error={errors.currentPassword?.message} className="sm:col-span-2">
                {(p) => (
                  <Input
                    {...p}
                    {...register("currentPassword")}
                    type={passwordType}
                    autoComplete="current-password"
                    trailing={
                      <IconButton
                        label={showPasswords ? "Hide passwords" : "Show passwords"}
                        aria-pressed={showPasswords}
                        icon={showPasswords ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        size="sm"
                        className="size-7 pointer-coarse:size-9"
                        onClick={() => setShowPasswords((s) => !s)}
                      />
                    }
                  />
                )}
              </Field>
              <Field label="New password" error={errors.newPassword?.message}>
                {(p) => <Input {...p} {...register("newPassword")} type={passwordType} autoComplete="new-password" />}
              </Field>
              <Field label="Confirm new password" error={errors.confirmPassword?.message}>
                {(p) => <Input {...p} {...register("confirmPassword")} type={passwordType} autoComplete="new-password" />}
              </Field>
            </div>
            <p className="mt-3 text-caption text-ink-subtle">Leave empty to keep your current password. Changing it signs out your other devices.</p>
          </Section>

          {/* The one Save button for the whole page */}
          <div className="flex items-center justify-end gap-2 border-t border-line bg-paper/50 px-5 py-4 sm:px-6">
            <AnimatePresence initial={false}>
              {dirty && (
                <m.span key="dirty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-auto text-caption text-ink-muted">
                  Unsaved changes
                </m.span>
              )}
            </AnimatePresence>
            <Button variant="ghost" disabled={!dirty || isSubmitting} onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!dirty || uploading}>
              Save changes
            </Button>
          </div>
        </Card>
      </m.div>
    </form>
  );
}

function Section({ title, divider = false, children }: { title: string; divider?: boolean; children: ReactNode }) {
  return (
    <section className={cn("p-5 sm:p-6", divider && "border-t border-line")}>
      <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}
