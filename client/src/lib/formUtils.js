/**
 * Safely reset a native HTML form (e.g. clears file inputs). No-op if missing.
 * @param {HTMLFormElement | null | undefined} formEl
 */
export function safeResetForm(formEl) {
  if (formEl && typeof formEl.reset === "function") {
    try {
      formEl?.reset?.();
    } catch {
      /* ignore */
    }
  }
}
