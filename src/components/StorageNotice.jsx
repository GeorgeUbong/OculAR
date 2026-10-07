import { useState } from "react";

const NOTICE_KEY = "ocular-storage-notice-seen";

export default function StorageNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(NOTICE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  function dismiss() {
    try {
      localStorage.setItem(NOTICE_KEY, "true");
    } catch {
      // Keep the notice dismissible when persistent storage is unavailable.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-copy/10 bg-surface px-5 py-4 text-copy shadow-2xl"
    >
      <p className="font-gsans text-sm leading-6 text-brand-grey">
        Uploaded assets are stored in your browser.
      </p>
      <button
        type="button"  
        onClick={dismiss}
        className="flex-none rounded-full bg-brand-secondary px-4 py-2 font-gsans text-sm font-medium text-on-accent transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
      >
        OK
      </button>
    </div>
  );
}