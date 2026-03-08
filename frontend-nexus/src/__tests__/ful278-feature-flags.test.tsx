/**
 * FUL-278: Feature Flag Engine — frontend tests
 *
 * Covers:
 * 1. useFeatureFlag returns enabled=true when the API resolves the flag as enabled.
 * 2. useFeatureFlag returns enabled=false when the flag is disabled.
 * 3. useFeatureFlag returns enabled=false on API error (safe default).
 * 4. Flag starts in loading=true and transitions to loading=false after resolution.
 * 5. FeatureGate component renders children when flag is enabled, hides them when disabled.
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import '@testing-library/jest-dom';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';

// Mock the feature-flags API module so tests never hit the network
jest.mock('../lib/feature-flags', () => ({
  evaluateFlag: jest.fn(),
}));

// Import AFTER mocking so the hook receives the mock
import { FeatureGate } from '../components/FeatureGate';
import { evaluateFlag } from '../lib/feature-flags';
import { useFeatureFlag } from '../stores/use-feature-flag';

const mockEvaluateFlag = evaluateFlag as jest.MockedFunction<
  typeof evaluateFlag
>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns enabled=true when the API resolves the flag as enabled', async () => {
    mockEvaluateFlag.mockResolvedValueOnce({
      feature_key: 'advanced_reports',
      enabled: true,
      tenant_id: 1,
    });

    const { result } = renderHook(() =>
      useFeatureFlag('advanced_reports')
    );

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.enabled).toBe(false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(true);
  });

  it('returns enabled=false when the flag is disabled', async () => {
    mockEvaluateFlag.mockResolvedValueOnce({
      feature_key: 'bulk_export',
      enabled: false,
      tenant_id: 1,
    });

    const { result } = renderHook(() =>
      useFeatureFlag('bulk_export')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(false);
  });

  it('returns enabled=false on API error (safe deny default)', async () => {
    mockEvaluateFlag.mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useFeatureFlag('telemedicine')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(false);
  });

  it('transitions loading from true to false after resolution', async () => {
    let resolveFlag!: (
      value: Awaited<ReturnType<typeof evaluateFlag>>
    ) => void;
    mockEvaluateFlag.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFlag = res;
        })
    );

    const { result } = renderHook(() =>
      useFeatureFlag('ai_insights')
    );

    expect(result.current.loading).toBe(true);

    act(() => {
      resolveFlag({
        feature_key: 'ai_insights',
        enabled: true,
        tenant_id: 2,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.enabled).toBe(true);
  });
});

describe('FeatureGate component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when the flag is enabled', async () => {
    mockEvaluateFlag.mockResolvedValueOnce({
      feature_key: 'advanced_reports',
      enabled: true,
      tenant_id: 1,
    });

    render(
      <FeatureGate featureKey="advanced_reports">
        <span>Advanced Reports</span>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Advanced Reports')
      ).toBeInTheDocument();
    });
  });

  it('renders fallback when the flag is disabled', async () => {
    mockEvaluateFlag.mockResolvedValueOnce({
      feature_key: 'bulk_export',
      enabled: false,
      tenant_id: 1,
    });

    render(
      <FeatureGate
        featureKey="bulk_export"
        fallback={<span>Upgrade to access bulk export</span>}
      >
        <span>Bulk Export</span>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Upgrade to access bulk export')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Bulk Export')).not.toBeInTheDocument();
  });

  it('renders fallback when the API errors (deny by default)', async () => {
    mockEvaluateFlag.mockRejectedValueOnce(
      new Error('403 Forbidden')
    );

    render(
      <FeatureGate
        featureKey="telemedicine"
        fallback={<span>Not available</span>}
      >
        <span>Telemedicine</span>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Not available')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Telemedicine')
    ).not.toBeInTheDocument();
  });

  it('shows loading state while flag is being fetched', async () => {
    // Never resolves during this test
    mockEvaluateFlag.mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(
      <FeatureGate
        featureKey="ai_insights"
        loadingFallback={<div data-testid="loading">Loading…</div>}
      >
        <span>AI Insights</span>
      </FeatureGate>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
  });
});
