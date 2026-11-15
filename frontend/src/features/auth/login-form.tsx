"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { m, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { clientFetch } from "@/lib/api/client-fetch";
import { isApiError } from "@/lib/api/errors";
import type { ApiData, PublicUser } from "@/lib/api/types";
import { safeNextPath } from "@/lib/auth/session";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { userLoaded } from "@/store/slices/auth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;
type Pending = "password" | "demo" | null;

/** API error codes → what the person should read. */
function messageFor(code: string, fallback: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect.";
    case "RATE_LIMITED":
      return "Too many sign-in attempts. Please wait 15 minutes and try again.";
    case "NETWORK_ERROR":
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return fallback;
  }
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState<Pending>(null);
  const [demoPending, setDemoPending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    // Validate on submit first, then live as the user fixes a field.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const busy = isSubmitting || demoPending || redirecting !== null;

  const enterApp = (user: PublicUser, via: Exclude<Pending, null>) => {
    dispatch(userLoaded(user));
    setRedirecting(via);
    // Read ?next= at submit time (no useSearchParams, so the page stays fully static); same-site paths only.
    router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  const showError = (error: unknown) => {
    if (!isApiError(error)) throw error;
    toast.error("Couldn't sign in", messageFor(error.code, error.message));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { data } = await clientFetch<ApiData<{ user: PublicUser }>>("/auth/login", { method: "POST", body: values });
      enterApp(data.user, "password");
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_ERROR") {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === "email" || field === "password") setError(field, { message });
        }
        return;
      }
      showError(error);
      // Ready to retype: select the password so typing replaces it.
      if (isApiError(error) && error.code === "INVALID_CREDENTIALS") setFocus("password", { shouldSelect: true });
    }
  });

  const onDemo = async () => {
    setDemoPending(true);
    try {
      const { data } = await clientFetch<ApiData<{ user: PublicUser }>>("/auth/demo", { method: "POST" });
      toast.info(
        "Signed in as the demo admin",
        "View only: you can browse everything, but adding, editing and deleting is blocked. The main admin can view, add, edit and delete.",
      );
      enterApp(data.user, "demo");
    } catch (error) {
      showError(error);
    } finally {
      setDemoPending(false);
    }
  };

  return (
    <m.form onSubmit={onSubmit} noValidate variants={stagger} initial="hidden" animate="visible" className={cn("grid gap-5", className)}>
      <m.div variants={rise}>
        <Field label="Email" error={errors.email?.message}>
          {(control) => (
            <Input {...control} {...register("email")} type="email" inputMode="email" autoComplete="username" placeholder="name@example.com" />
          )}
        </Field>
      </m.div>

      <m.div variants={rise}>
        <Field label="Password" error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              trailing={
                <IconButton
                  label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  icon={showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  size="sm"
                  className="size-7 pointer-coarse:size-9"
                  onClick={() => setShowPassword((shown) => !shown)}
                />
              }
            />
          )}
        </Field>
      </m.div>

      <m.div variants={rise} className="mt-1">
        <Button type="submit" size="lg" fullWidth loading={isSubmitting || redirecting === "password"} disabled={busy}>
          {redirecting === "password" ? "Signing in…" : "Sign in"}
        </Button>
      </m.div>

      <m.div variants={rise} className="flex items-center gap-3 text-caption font-medium uppercase tracking-wider text-ink-subtle">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </m.div>

      <m.div variants={rise}>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<EyeIcon size={18} />}
          loading={demoPending || redirecting === "demo"}
          disabled={busy}
          onClick={onDemo}
        >
          {redirecting === "demo" ? "Opening demo…" : "Demo login"}
        </Button>
      </m.div>
    </m.form>
  );
}
