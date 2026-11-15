import { useState, useRef, useCallback, useMemo } from "react";
import { UnsavedChangesContext } from "./hooks/useUnsavedChanges";

export function UnsavedChangesProvider({ children }) {
  const [dirtyForms, setDirtyForms] = useState({});
  const dirtyFormsRef = useRef({});
  const bypassBlockRef = useRef(false);

  const setFormDirty = useCallback((id, isDirty, label) => {
    const currentlyDirty = Boolean(dirtyFormsRef.current[id]);
    if (isDirty) {
      const nextLabel = label || id;
      if (currentlyDirty && dirtyFormsRef.current[id] === nextLabel) return;
      const next = { ...dirtyFormsRef.current, [id]: nextLabel };
      dirtyFormsRef.current = next;
      setDirtyForms(next);
      return;
    }

    if (!currentlyDirty) return;
    const next = { ...dirtyFormsRef.current };
    delete next[id];
    dirtyFormsRef.current = next;
    setDirtyForms(next);
  }, []);

  const clearAllDirtyAndBypass = useCallback(() => {
    bypassBlockRef.current = true;
    dirtyFormsRef.current = {};
    setDirtyForms({});
  }, []);

  const resetBypass = useCallback(() => {
    bypassBlockRef.current = false;
  }, []);

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (bypassBlockRef.current) return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return Object.keys(dirtyFormsRef.current).length > 0;
    },
    []
  );

  const dirtyFormLabels = useMemo(
    () => Object.values(dirtyForms),
    [dirtyForms]
  );
  const hasUnsavedChanges = dirtyFormLabels.length > 0;

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      dirtyFormLabels,
      setFormDirty,
      clearAllDirtyAndBypass,
      resetBypass,
      shouldBlockNavigation,
    }),
    [
      hasUnsavedChanges,
      dirtyFormLabels,
      setFormDirty,
      clearAllDirtyAndBypass,
      resetBypass,
      shouldBlockNavigation,
    ]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}
