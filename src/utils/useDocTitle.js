import { useEffect } from "react";

export function useDocTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Legacy Sign` : "Legacy Sign";
    return () => { document.title = prev; };
  }, [title]);
}
