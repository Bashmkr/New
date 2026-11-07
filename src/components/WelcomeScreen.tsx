"use client";

/* eslint-disable @next/next/no-img-element */

export function WelcomeScreen({ onEnter, leaving }: { onEnter: () => void; leaving: boolean }) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-4 transition-all duration-700 ${
        leaving ? "scale-[1.03] opacity-0" : "opacity-100"
      }`}
    >
      {/* subtle digital background */}
      <div className="digital-pattern pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <CircuitLines />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-teal via-green to-teal"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <img
          src="/brand/logo.png"
          alt="The Riyadh Schools – Al Malqa"
          width={2907}
          height={879}
          className="animate-rise h-auto w-[min(88vw,460px)]"
          style={{ animationDelay: "0.1s" }}
        />

        <div className="animate-rise mt-8 flex items-center gap-3" style={{ animationDelay: "0.35s" }}>
          <ShieldIcon />
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-teal/70 sm:text-sm">
            Cybersecurity Awareness Month
          </span>
        </div>

        <h1
          className="animate-rise mt-4 text-4xl font-bold tracking-[0.06em] text-teal sm:text-6xl"
          style={{ animationDelay: "0.5s" }}
        >
          CYBER SAFETY
          <span className="block text-green">GALLERY</span>
        </h1>

        <p
          className="animate-rise mt-6 max-w-xl text-base leading-relaxed text-[#2c5254] sm:text-lg"
          style={{ animationDelay: "0.7s" }}
        >
          Welcome to the Cyber Safety Gallery
          <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.28em] text-green-dark sm:text-sm">
            Protect your personal information
          </span>
        </p>

        <button
          type="button"
          onClick={onEnter}
          disabled={leaving}
          className="animate-rise group mt-10 inline-flex items-center gap-3 rounded-full bg-teal px-9 py-4 text-base font-semibold tracking-[0.18em] text-white shadow-lg shadow-teal/25 transition hover:bg-teal-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-green/50 sm:text-lg"
          style={{ animationDelay: "0.9s" }}
        >
          <span className="animate-pulse-ring rounded-full">
            <span className="block h-2.5 w-2.5 rounded-full bg-green" />
          </span>
          ENTER GALLERY
          <svg className="h-5 w-5 transition group-hover:translate-x-1" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="animate-fade mt-6 text-xs text-[#5b7a7c]" style={{ animationDelay: "1.3s" }}>
          A virtual 3D art exhibition · Works on computers, tablets and phones
        </p>
      </div>

      <footer className="absolute bottom-5 z-10 px-4 text-center text-[10px] tracking-wide text-[#7a9597]">
        Created by the ICT Girls Campus Team ·{" "}
        <a href="/staff" className="underline-offset-2 hover:text-teal hover:underline">
          Staff
        </a>
      </footer>
    </main>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6l-8-3Z" fill="#02D576" fillOpacity=".15" stroke="#03656B" strokeWidth="1.6" />
      <rect x="8.6" y="10.6" width="6.8" height="5.2" rx="1" fill="#03656B" />
      <path d="M10 10.6V9.2a2 2 0 0 1 4 0v1.4" stroke="#03656B" strokeWidth="1.6" />
    </svg>
  );
}

/** Thin circuit traces in the corners — a light cyber touch that stays on-brand. */
function CircuitLines() {
  const trace = "animate-trace";
  return (
    <>
      <svg className="pointer-events-none absolute -left-4 top-0 h-64 w-64 opacity-60 sm:h-80 sm:w-80" viewBox="0 0 200 200" fill="none" aria-hidden>
        <path className={trace} d="M0 40h60l20 20h60M0 80h40l30 30v60M20 0v30l20 20" stroke="#03656B" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="140" cy="60" r="4" fill="#02D576" />
        <circle cx="70" cy="170" r="4" fill="#03656B" fillOpacity=".5" />
        <circle cx="40" cy="50" r="3" fill="#00CEFA" />
      </svg>
      <svg className="pointer-events-none absolute -right-4 bottom-0 h-64 w-64 rotate-180 opacity-60 sm:h-80 sm:w-80" viewBox="0 0 200 200" fill="none" aria-hidden>
        <path className={trace} d="M0 40h60l20 20h60M0 80h40l30 30v60M20 0v30l20 20" stroke="#03656B" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="140" cy="60" r="4" fill="#02D576" />
        <circle cx="70" cy="170" r="4" fill="#03656B" fillOpacity=".5" />
        <circle cx="40" cy="50" r="3" fill="#FECC56" />
      </svg>
    </>
  );
}
