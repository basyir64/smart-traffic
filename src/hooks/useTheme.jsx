// src/hooks/useTheme.ts
import { useState } from "react";

export function useTheme() {
  const [isDark] = useState(true);

  return { isDark };
}
