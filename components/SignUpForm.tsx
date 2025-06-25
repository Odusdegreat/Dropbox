"use client";

import { useForm } from "react-hook-form";
import { useSignUp } from "@clerk/nextjs";
import { z } from "zod";
import { signUpSchema } from "@/schemas/signUpSchema";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";

export default function SignUpForm() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const { signUp, isLoaded, setActive } = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    if (!isLoaded) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setVerifying(true);
    } catch (error: unknown) {
      console.error("Signup error:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "errors" in error &&
        Array.isArray((error as { errors?: { message: string }[] }).errors)
      ) {
        setAuthError(
          (error as { errors: { message: string }[] }).errors?.[0]?.message ||
            "An error occurred during signup. Please try again."
        );
      } else {
        setAuthError("An error occurred during signup. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setIsSubmitting(true);
    setVerificationError(null);

    try {
      await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      await setActive({ session: signUp.createdSessionId });
      router.push("/dashboard");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "errors" in error &&
        Array.isArray((error as { errors?: { message: string }[] }).errors)
      ) {
        setVerificationError(
          (error as { errors?: { message: string }[] }).errors?.[0]?.message ||
            "An error occurred during verification."
        );
      } else {
        setVerificationError("An error occurred during verification.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <Card className="max-w-md w-full p-6">
        <CardHeader>
          <h2 className="text-lg font-bold text-center">
            Enter Verification Code
          </h2>
        </CardHeader>
        <Divider />
        <form onSubmit={handleVerificationSubmit} className="space-y-4 mt-4">
          <Input
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter code sent to your email"
          />
          {verificationError && (
            <p className="text-sm text-red-500">{verificationError}</p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full p-6">
      <CardHeader>
        <h2 className="text-lg font-bold text-center">Create your account</h2>
      </CardHeader>
      <Divider />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <Input
          label="Email"
          {...register("email")}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}

        <Input
          label="Password"
          type="password"
          {...register("password")}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}

        <Input
          label="Confirm Password"
          type="password"
          {...register("passwordConfirmation")}
          placeholder="••••••••"
        />
        {errors.passwordConfirmation && (
          <p className="text-sm text-red-500">
            {errors.passwordConfirmation.message}
          </p>
        )}

        {authError && (
          <p className="text-sm text-red-600 text-center">{authError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </Button>
      </form>
    </Card>
  );
}
