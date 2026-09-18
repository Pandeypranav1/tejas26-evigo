"use client";

import { Container } from "@/components/Container";

export function FirebaseNotConfigured({
  title = "Firebase not configured properly",
}: {
  title?: string;
}) {
  return (
    <main className="flex-1 py-12">
      <Container>
        <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-black text-amber-950">{title}</h1>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Add your Firebase keys in <span className="font-mono">.env.local</span> and
            restart the dev server.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4 text-sm font-semibold text-zinc-800">
            <div className="font-black">Required env vars</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
              <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            </ul>
          </div>
          <p className="mt-4 text-sm font-semibold text-amber-900">
            Firebase Console checklist: enable <b>Phone Authentication</b> and add{" "}
            <b>localhost</b> to Authorized Domains.
          </p>
        </div>
      </Container>
    </main>
  );
}

