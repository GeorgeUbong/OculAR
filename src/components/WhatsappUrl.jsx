// Your number in international format: digits only, no "+", no leading zeros.
// Example (Nigeria): 2348012345678
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "234XXXXXXXXXX";

export function buildWhatsAppUrl({ name, email, description }) {
    const text = [
        "*New message from OculAR*",
        "",
        `*Name:* ${name.trim()}`,
        `*Email:* ${email.trim()}`,
        "",
        `*Message:*`,
        description.trim(),
    ].join("\n");

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function sendToWhatsApp(fields) {
    const url = buildWhatsAppUrl(fields);

    // Must run directly inside the submit/click handler, otherwise
    // browsers treat it as a popup and block it.
    const win = window.open(url, "_blank", "noopener,noreferrer");

    // Popup blocked: fall back to navigating in the same tab
    if (!win) window.location.href = url;
}