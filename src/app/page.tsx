// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // later: call real auth API here
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-slate-950" />
          <span className="text-sm font-semibold tracking-tight">
            Umbrella SaaS
          </span>
        </div>
        <Link
          href="/signup"
          className="text-sm text-slate-600 hover:text-slate-950"
        >
          Create account
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Sign in
            </CardTitle>
            <CardDescription>
              Access your Umbrella dashboard and services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-slate-600">
            <div className="w-full text-center">
              <span className="mr-1">Don&apos;t have an account?</span>
              <Link href="/signup" className="font-medium underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
