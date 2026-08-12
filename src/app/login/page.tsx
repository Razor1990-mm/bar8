import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Member Login" };

export default function LoginPage() {
  return (
    <main className="relative flex-1">
      <PublicNav />
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
        <p className="type-label mb-6">Member Login</p>
        <h1 className="type-display mb-10 text-3xl md:text-5xl">
          Welcome back.
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
