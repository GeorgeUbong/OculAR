import React from "react";

// Loader styles live here so this file is fully self-contained.
const loaderCss = `
.ocular-loader {
  width: 65px;
  aspect-ratio: 1;
  position: relative;
  color: var(--loader-color, #fff);
}

.ocular-loader:before,
.ocular-loader:after {
  content: "";
  position: absolute;
  border-radius: 50px;
  box-shadow: 0 0 0 3px inset currentColor;
  animation: ocular-l4 2.5s infinite;
}

.ocular-loader:after {
  animation-delay: -1.25s;
}

@keyframes ocular-l4 {
  0%    { inset: 0 35px 35px 0; }
  12.5% { inset: 0 35px 0 0; }
  25%   { inset: 35px 35px 0 0; }
  37.5% { inset: 35px 0 0 0; }
  50%   { inset: 35px 0 0 35px; }
  62.5% { inset: 0 0 0 35px; }
  75%   { inset: 0 0 35px 35px; }
  87.5% { inset: 0 0 35px 0; }
  100%  { inset: 0 35px 35px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ocular-loader:before,
  .ocular-loader:after { animation: none; inset: 0 35px 35px 0; }
  .ocular-loader:after { inset: 35px 0 0 35px; }
}
`;

/**
 * Fullscreen loading page.
 * <LoadingPage />
 * <LoadingPage message="Preparing your scene..." />
 */
export default function LoadingPage({ message = "Loading..." }) {
    return (
        <main
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[#101010] px-6 text-center text-white"
        >
            <style>{loaderCss}</style>

            <div className="ocular-loader" aria-hidden="true" />

            <p className="font-gsans text-sm tracking-wide text-white/60 sm:text-base">
                {message}
            </p>
        </main>
    );
}