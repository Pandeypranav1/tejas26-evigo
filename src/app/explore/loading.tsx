"use client";

export default function ExploreLoading() {
  return (
    <main className="flex-1 pb-16">
      {/* Hero shimmer */}
      <div
        className="border-b border-zinc-100 py-10 sm:py-14"
        style={{
          background:
            "linear-gradient(180deg,#faf5ff 0%,#f0f9ff 50%,#fff 100%)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="shimmer-line" style={{ width: 200, height: 24, borderRadius: 100 }} />
            <div className="shimmer-line" style={{ width: 320, height: 40, borderRadius: 12 }} />
            <div className="shimmer-line" style={{ width: 280, height: 16, borderRadius: 8 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
        {/* Filter bar shimmer */}
        <div
          className="my-6 sm:my-7 rounded-2xl border border-zinc-200 p-5"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
        >
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 min-w-[130px]">
                <div className="shimmer-line" style={{ width: 80, height: 12, borderRadius: 6, marginBottom: 8 }} />
                <div className="shimmer-line" style={{ width: "100%", height: 40, borderRadius: 12 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Category pills shimmer */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="shimmer-line" style={{ width: 80 + i * 10, height: 32, borderRadius: 100 }} />
          ))}
        </div>

        {/* Grid shimmer */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 overflow-hidden bg-white"
            >
              <div className="shimmer-line" style={{ width: "100%", height: 180, borderRadius: 0 }} />
              <div className="p-4 flex flex-col gap-2.5">
                <div className="shimmer-line" style={{ width: "70%", height: 16, borderRadius: 8 }} />
                <div className="shimmer-line" style={{ width: "40%", height: 12, borderRadius: 6 }} />
                <div className="shimmer-line" style={{ width: "50%", height: 14, borderRadius: 6 }} />
                <div className="flex gap-2 mt-2">
                  <div className="shimmer-line" style={{ flex: 1, height: 40, borderRadius: 12 }} />
                  <div className="shimmer-line" style={{ flex: 1, height: 40, borderRadius: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .shimmer-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  );
}
