import { useEffect } from "react";

export function useDocTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Sign Flow` : "Sign Flow";
    return () => { document.title = prev; };
  }, [title]);
}
