import { useContext } from "react";
import { ThemeCtx } from "../App";
import { T as LightT } from "../theme";

export function useT() {
  const ctx = useContext(ThemeCtx);
  return ctx?.T || LightT;
}
