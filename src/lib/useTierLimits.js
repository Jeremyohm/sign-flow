import { useState, useEffect, useCallback } from "react";
import * as db from "./db";

export function useTierLimits() {
  const [limits, setLimits] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, u] = await Promise.all([db.fetchTierLimits(), db.fetchUsage()]);
      setLimits(l);
      setUsage(u);
    } catch (err) {
      setError(err.message || "Failed to load tier limits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const tier = limits?.tier ?? "free";
  const isFree = tier === "free";

  const envelopesRemaining = limits?.envelopes_per_month == null
    ? null
    : Math.max(0, limits.envelopes_per_month - (usage?.envelopes_this_month ?? 0));

  const templatesRemaining = limits?.max_templates == null
    ? null
    : Math.max(0, limits.max_templates - (usage?.template_count ?? 0));

  const canAddRecipient = (filledCount) =>
    limits?.recipients_per_envelope == null
    || filledCount < limits.recipients_per_envelope;

  return {
    loading, error, limits, usage, refetch,
    tier, isFree, envelopesRemaining, templatesRemaining, canAddRecipient,
  };
}
