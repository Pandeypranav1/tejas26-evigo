'use client';

import React, { useState } from "react";
import { PageContainer } from "@/components/PageContainer";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = () => {
    if (!name.trim()) return "Name is required";
    if (!email.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Invalid email address";
    if (!message.trim()) return "Message is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Contact] Submit triggered");
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      console.log("[Contact] Sending POST /api/contact");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      console.log("[Contact] Response status:", res.status);
      const data = await res.json();
      console.log("[Contact] Response body:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setSuccess(data.message || "Message sent successfully!");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      console.error("[Contact] Error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#05030f] text-white selection:bg-violet-500/30 relative w-full overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <main className="flex-1 relative z-10 w-full py-16 sm:py-20">
        <PageContainer className="flex flex-col items-center justify-center">
          <div className="max-w-3xl w-full text-center mb-12 sm:mb-16">
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
              Get in Touch
            </h1>
            <p className="text-lg sm:text-xl text-white/60">
              We&apos;d love to hear from you. Reach out to the Evigo team for support, partnerships, or any inquiries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">✉️</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">Email</div>
                    <a href="mailto:support.evigo@gmail.com" className="text-white/70 hover:text-cyan-400 text-sm transition-colors">
                      support.evigo@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">📞</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">Phone</div>
                    <a href="tel:+917808807340" className="text-white/70 hover:text-cyan-400 text-sm transition-colors">
                      7808807340
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">📍</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">Location</div>
                    <div className="text-white/70 text-sm">Samastipur, Bihar, India</div>
                  </div>
                </div>
              </div>
            </div>

            <form className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm flex flex-col gap-4" onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold mb-2">Send a Message</h2>

              {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                  <p className="text-green-400 text-sm font-medium">{success}</p>
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Message</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors h-24 resize-none"
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl py-3 mt-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}
