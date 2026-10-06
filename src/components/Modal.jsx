import { useEffect, useRef } from "react";

/**
 * Notice mode   (no onConfirm): one OK button.
 * Confirm mode  (onConfirm set): Cancel + confirm button.
 * `destructive` styles the confirm button red and focuses Cancel first.
 */
export default function Modal({
    title = "Notice",
    message,
    onClose,
    onConfirm,
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    destructive = false,
}) {
    const safeButtonRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const isConfirm = typeof onConfirm === "function";

    useEffect(() => {
        if (!message) return;

        safeButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onCloseRef.current();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [message]);

    if (!message) return null;

    const buttonBase =
        "rounded-full px-6 py-3 font-gsans font-medium shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-main";

    const confirmClass = destructive
        ? "bg-red-600 text-white"
        : "bg-brand-secondary text-on-accent";

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role={isConfirm ? "alertdialog" : "dialog"}
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby="modal-message"
                className="w-full max-w-md rounded-xl border border-copy/10 bg-surface p-6 text-copy shadow-2xl"
            >
                <h2 id="modal-title" className="font-playpen text-2xl font-bold">
                    {title}
                </h2>

                <p id="modal-message" className="mt-3 font-gsans text-base leading-7 text-brand-grey">
                    {message}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    {isConfirm ? (
                        <>
                            <button
                                ref={safeButtonRef}
                                type="button"
                                onClick={onClose}
                                className={`${buttonBase} border border-copy/15 bg-transparent text-copy`}
                            >
                                {cancelLabel}
                            </button>

                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`${buttonBase} ${confirmClass}`}
                            >
                                {confirmLabel}
                            </button>
                        </>
                    ) : (
                        <button
                            ref={safeButtonRef}
                            type="button"
                            onClick={onClose}
                            className={`${buttonBase} bg-brand-secondary text-on-accent`}
                        >
                            {confirmLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}