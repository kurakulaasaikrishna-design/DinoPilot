import { FormEvent, useState } from 'react';

const API_URL = 'http://localhost:4000';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'OWNER' | 'STAFF';
    restaurantId: string;
  };
};

export default function StaffLogin({
  onLogin,
}: {
  onLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const result = data as LoginResponse;

      localStorage.setItem('dinepilot_token', result.token);
      localStorage.setItem(
        'dinepilot_user',
        JSON.stringify(result.user),
      );

      onLogin();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9]">

      {/* ================================================= */}
      {/* DESKTOP BACKGROUND DECORATION */}
      {/* ================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* ================================================= */}
      {/* PAGE */}
      {/* ================================================= */}

      <div className="relative flex min-h-screen w-full">

        {/* ================================================= */}
        {/* LEFT BRAND PANEL - DESKTOP */}
        {/* ================================================= */}

        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-[46%] xl:w-[48%]">

          {/* Decorative circles */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full border border-white/5" />

          <div className="relative flex w-full flex-col justify-between p-10 xl:p-14">

            {/* Logo */}
            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl">
                <span className="text-xl font-black">
                  D
                </span>
              </div>

              <div>
                <p className="text-lg font-black tracking-tight text-white">
                  DinePilot
                </p>

                <p className="text-xs font-medium text-slate-400">
                  Restaurant Management
                </p>
              </div>

            </div>

            {/* Main message */}
            <div className="max-w-xl">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                  Restaurant Operations
                </span>
              </div>

              <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">
                Run your restaurant
                <span className="block text-blue-400">
                  smarter.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-400 xl:text-base">
                Manage orders, tables, menus and daily restaurant
                operations from one simple workspace.
              </p>

              {/* Feature list */}
              <div className="mt-9 space-y-4">

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm">
                    🧾
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      Live Order Management
                    </p>

                    <p className="text-xs text-slate-500">
                      Stay on top of every incoming order.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm">
                    🪑
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      Table Management
                    </p>

                    <p className="text-xs text-slate-500">
                      Keep your floor organized.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sm">
                    📊
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      Simple Operations
                    </p>

                    <p className="text-xs text-slate-500">
                      Everything your team needs in one place.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-6">

              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} DinePilot
              </p>

              <p className="text-xs font-medium text-slate-500">
                Run Your Restaurant Smarter.
              </p>

            </div>

          </div>
        </section>

        {/* ================================================= */}
        {/* RIGHT LOGIN PANEL */}
        {/* ================================================= */}

        <main className="flex min-h-screen flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">

          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-8 flex flex-col items-center lg:hidden">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/50">
                <span className="text-xl font-black">
                  D
                </span>
              </div>

              <h1 className="mt-4 text-xl font-black tracking-tight text-slate-950">
                DinePilot
              </h1>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Run Your Restaurant Smarter
              </p>

            </div>

            {/* Login card */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] sm:p-8">

              {/* Heading */}
              <div className="mb-7">

                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="text-lg">
                    →
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Sign in to access your restaurant workspace.
                </p>

              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* Email */}
                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                  >
                    Email address
                  </label>

                  <div className="relative">

                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      @
                    </div>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />

                  </div>

                </div>

                {/* Password */}
                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      •••
                    </div>

                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />

                  </div>

                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">

                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">
                      !
                    </div>

                    <div>
                      <p className="text-xs font-bold text-red-800">
                        Sign in failed
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-red-600">
                        {error}
                      </p>
                    </div>

                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-blue-600 hover:shadow-blue-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to DinePilot

                      <span className="transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </>
                  )}
                </button>

              </form>

              {/* Security note */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
                <span className="text-emerald-500">
                  ●
                </span>

                Secure restaurant workspace
              </div>

            </div>

            {/* Mobile footer */}
            <p className="mt-6 text-center text-[11px] font-medium text-slate-400 lg:hidden">
              DinePilot · Run Your Restaurant Smarter.
            </p>

          </div>

        </main>

      </div>
    </div>
  );
}