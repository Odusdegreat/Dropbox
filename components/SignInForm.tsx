"use client";

import { signInSchema } from "@/schemas/signInSchema";
import { useSignIn } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardHeader } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignInForm() {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<z.infer<typeof signInSchema>>({
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
        router.push("/dashboard"); // redirect after login
      } else {
        setAuthError("Sign in error");
      }
    } catch (error: any) {
      setAuthError(
        error.errors?.[0]?.message || "An error occurred during sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl">
      <CardHeader className="flex flex-col gap-1 items-center pb-2">
        <h1 className="text-2xl font-bold text-default-900">Welcome Back</h1>
        <p className="text-default-500 text-center">
          Sign in to access your secure cloud storage
        </p>
      </CardHeader>
      <Divider />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-6"
      >
        <Input
          type="email"
          placeholder="Email"
          {...register("identifier")}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          {...register("password")}
          required
        />
        {authError && <p className="text-red-500 text-sm">{authError}</p>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Card>
  );
}
