import { createContext, useContext, useEffect } from "react";

export const UnsavedChangesContext = createContext(null);

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error(
      "useUnsavedChanges must be used inside UnsavedChangesProvider"
    );
  }
  return ctx;
}

/**
 * Registers a form or modal with the global unsaved-changes guard.
 * Automatically clears its dirty flag when `isDirty` becomes false or on unmount.
 */
export function useRegisterUnsavedForm(id, isDirty, label) {
  const ctx = useContext(UnsavedChangesContext);
  const setFormDirty = ctx?.setFormDirty;

  useEffect(() => {
    if (!setFormDirty) return;
    setFormDirty(id, Boolean(isDirty), label);
  }, [setFormDirty, id, isDirty, label]);

  useEffect(() => {
    if (!setFormDirty) return;
    return () => {
      setFormDirty(id, false, label);
    };
  }, [setFormDirty, id, label]);
}

/**
 * Compares an initial edit-modal snapshot against current form state,
 * coercing number/string pairs uniformly and checking string arrays element-wise.
 */
export function isFormStateDirty(initialState, currentState) {
  if (!initialState || !currentState) return false;
  const keys = Object.keys(initialState);
  for (const key of keys) {
    const a = initialState[key];
    const b = currentState[key];
    if (Array.isArray(a) || Array.isArray(b)) {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      if (arrA.length !== arrB.length) return true;
      for (let i = 0; i < arrA.length; i += 1) {
        if (String(arrA[i] ?? "") !== String(arrB[i] ?? "")) return true;
      }
    } else if (typeof a === "boolean" || typeof b === "boolean") {
      if (Boolean(a) !== Boolean(b)) return true;
    } else if (String(a ?? "") !== String(b ?? "")) {
      return true;
    }
  }
  return false;
}
