'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from '../auth-actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? 'लॉगिन हो रहा है…' : 'लॉगिन करें'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, {});
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-brand text-2xl font-black text-white">अ</span>
          <h1 className="mt-3 text-xl font-black">ApneNews एडमिन</h1>
          <p className="text-sm text-[var(--text-soft)]">प्रकाशन नियंत्रण कक्ष में लॉगिन करें</p>
        </div>
        <form action={formAction} className="card space-y-4 p-6">
          {state?.error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {state.error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold">ईमेल</label>
            <input name="email" type="email" required defaultValue="admin@apnenews.local" className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-brand" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">पासवर्ड</label>
            <input name="password" type="password" required className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-brand" />
          </div>
          <SubmitBtn />
          <p className="text-center text-xs text-[var(--text-soft)]">डेमो: admin@apnenews.local / ChangeMe123!</p>
        </form>
      </div>
    </div>
  );
}
