"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { signInSchema } from "@/schemas/signInSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";

export default function SignInForm() {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    if (!isLoaded) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const result = await signIn.create({
        identifier: data.identifier,
        password: data.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setAuthError("Sign in error");
      }
    } catch (error: unknown) {
      type ClerkError = { errors: { message: string; code: string }[] };

      if (
        typeof error === "object" &&
        error !== null &&
        "errors" in error &&
        Array.isArray((error as ClerkError).errors)
      ) {
        const err = (error as ClerkError).errors[0];

        if (err.code === "form_identifier_not_found") {
          setAuthError("Account not found. Please sign up first.");
        } else if (err.code === "form_password_incorrect") {
          setAuthError("Incorrect password. Please try again.");
        } else {
          setAuthError(err.message);
        }
      } else {
        setAuthError("An unexpected error occurred during sign in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl p-6">
      <CardHeader className="flex flex-col gap-1 items-center pb-2">
        <h1 className="text-2xl font-bold text-default-900">Welcome Back</h1>
        <p className="text-default-500 text-center">
          Sign in to access your secure cloud storage
        </p>
      </CardHeader>
      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
        <div>
          <Input
            label="Email or Username"
            {...register("identifier")}
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {errors.identifier && (
            <p className="text-sm text-red-500 mt-1">
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <Input
            type="password"
            label="Password"
            {...register("password")}
            placeholder="••••••••"
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {authError && (
          <p className="text-sm text-red-600 text-center">{authError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Card>
  );
}
