export function getAdminEmails(): string[] {
    const raw =
        process.env.NEXT_PUBLIC_ADMIN_PROVIDER_EMAILS ??
        process.env.ADMIN_PROVIDER_EMAILS ??
        "";

    return raw
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    return getAdminEmails().includes(normalized);
}
