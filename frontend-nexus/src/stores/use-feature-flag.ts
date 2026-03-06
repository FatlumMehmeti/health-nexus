/**
 * useFeatureFlag(featureKey)
 * ==========================
 * React hook that resolves whether a feature is enabled for the current
 * user's tenant. Fetches from the backend on first call per key, then
 * caches the result for the component's lifetime.
 *
 * Returns:
 *   - enabled: boolean  (false while loading, false on error)
 *   - loading: boolean
 *
 * Usage:
 *   const { enabled } = useFeatureFlag('advanced_reports');
 *   if (!enabled) return <UpgradePrompt />;
 */
import { useEffect, useState } from 'react';
import { evaluateFlag } from '../lib/feature-flags';

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
}

export function useFeatureFlag(featureKey: string): FeatureFlagState {
  const [state, setState] = useState<FeatureFlagState>({
    enabled: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    evaluateFlag(featureKey)
      .then((result) => {
        if (!cancelled) {
          setState({ enabled: result.enabled, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ enabled: false, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [featureKey]);

  return state;
}
