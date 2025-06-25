"use client";
import React from "react";
import { useSignUp } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUpSchema } from "@/schemas/signUpSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";
export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      if (!isLoaded) return;
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });
      await setActive({ session: result.createdSessionId });
      router.push("/dashboard");
    } catch (error: unknown) {
      type ClerkError = { errors: { message: string }[] };
      if (
        typeof error === "object" &&
        error !== null &&
        "errors" in error &&
        Array.isArray((error as ClerkError).errors) &&
        (error as ClerkError).errors[0]?.message
      ) {
        setAuthError((error as ClerkError).errors[0].message);
      } else {
        setAuthError("An error occurred during signup. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-xl font-semibold">Sign Up</h2>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <Input label="Email" type="email" {...register("email")} />
          {errors.email?.message && (
            <div className="text-red-500 text-sm">{errors.email.message}</div>
          )}
          <Input label="Password" type="password" {...register("password")} />
          {errors.password?.message && (
            <div className="text-red-500 text-sm">
              {errors.password.message}
            </div>
          )}
          <Input
            label="Confirm Password"
            type="password"
            {...register("passwordConfirmation")}
          />
          {errors.passwordConfirmation?.message && (
            <div className="text-red-500 text-sm">
              {errors.passwordConfirmation.message}
            </div>
          )}
          {authError && <div className="text-red-500 text-sm">{authError}</div>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Signing Up..." : "Sign Up"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
