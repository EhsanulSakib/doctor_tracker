"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { clientFetch } from "@/lib/api/client-fetch";
import { isApiError } from "@/lib/api/errors";
import type { ApiData, PublicUser } from "@/lib/api/types";
import { safeNextPath } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { userLoaded } from "@/store/slices/auth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

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

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { data } = await clientFetch<ApiData<{ user: PublicUser }>>("/auth/login", { method: "POST", body: values });
      dispatch(userLoaded(data.user));
      setRedirecting(true);
      // Read ?next= at submit time (no useSearchParams, so the page stays fully static); same-site paths only.
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    } catch (error) {
      if (!isApiError(error)) throw error;
      if (error.code === "VALIDATION_ERROR") {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === "email" || field === "password") setError(field, { message });
        }
        return;
      }
      setFormError(messageFor(error.code, error.message));
      // Ready to retype: select the password so typing replaces it.
      if (error.code === "INVALID_CREDENTIALS") setFocus("password", { shouldSelect: true });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className={cn("grid gap-5", className)}>
      {formError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <Field label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} {...register("email")} type="email" inputMode="email" autoComplete="username" placeholder="name@example.com" />
        )}
      </Field>

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

      <Button type="submit" size="lg" fullWidth loading={isSubmitting || redirecting} className="mt-1">
        {redirecting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
