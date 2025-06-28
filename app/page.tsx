"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { FaEyeSlash } from "react-icons/fa";
import { IoEyeSharp } from "react-icons/io5";

// Schema definition
const signUpSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

type FormData = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
  const router = useRouter();
  const { signUp, isLoaded } = useSignUp();

  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!isLoaded) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: unknown) {
      type ClerkError = { errors: { message: string }[] };
      const message =
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as ClerkError).errors)
          ? (err as ClerkError).errors[0]?.message
          : "Signup failed";
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        router.push("/sign-in"); // ✅ Redirect to login, not dashboard
      }
    } catch (err: unknown) {
      type ClerkError = { errors: { message: string }[] };
      const message =
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as ClerkError).errors)
          ? (err as ClerkError).errors[0]?.message
          : "Invalid code";
      setVerificationError(message);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form
          onSubmit={handleVerification}
          className="bg-white shadow-lg p-6 rounded-lg max-w-md w-full"
        >
          <h2 className="text-xl font-semibold text-center mb-4">
            Enter Verification Code
          </h2>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Enter code"
          />
          {verificationError && (
            <p className="text-sm text-red-500 mt-2">{verificationError}</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Verify
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-6 rounded-lg shadow-md max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          Create your account
        </h2>

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full border p-2 rounded"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4 relative">
          <label className="block mb-1">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            {...register("password")}
            className="w-full border p-2 rounded pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-9 right-3 text-gray-500"
          >
            {showPassword ? <FaEyeSlash /> : <IoEyeSharp />}
          </button>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-4 relative">
          <label className="block mb-1">Confirm Password</label>
          <input
            type={showConfirmPassword ? "text" : "password"}
            {...register("passwordConfirmation")}
            className="w-full border p-2 rounded pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute top-9 right-3 text-gray-500"
          >
            {showConfirmPassword ? <FaEyeSlash /> : <IoEyeSharp />}
          </button>
          {errors.passwordConfirmation && (
            <p className="text-sm text-red-500">
              {errors.passwordConfirmation.message}
            </p>
          )}
        </div>

        {/* Auth error */}
        {authError && (
          <p className="text-sm text-red-600 text-center">{authError}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Sign Up"}
        </button>

        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => router.push("/sign-in")}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Sign in
          </span>
        </p>
      </form>
    </div>
  );
}
