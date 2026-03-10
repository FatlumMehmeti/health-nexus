import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockLoadStripe = jest.fn(async (_key?: string) => ({}));
let mockStripe: {
  confirmCardPayment: jest.Mock;
} | null = null;
let mockElements: {
  getElement: jest.Mock;
} | null = null;
let StripePaymentModal: typeof import('@/components/StripePaymentModal').StripePaymentModal;

beforeAll(async () => {
  await jest.unstable_mockModule('@stripe/stripe-js', () => ({
    __esModule: true,
    loadStripe: (key: string) => mockLoadStripe(key),
  }));

  await jest.unstable_mockModule('@stripe/react-stripe-js', () => ({
    __esModule: true,
    Elements: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="stripe-elements">{children}</div>
    ),
    CardElement: () => <div data-testid="card-element" />,
    useStripe: () => mockStripe,
    useElements: () => mockElements,
  }));

  await jest.unstable_mockModule('@/components/ui/dialog', () => ({
    __esModule: true,
    Dialog: ({
      open,
      children,
    }: {
      open: boolean;
      children: React.ReactNode;
    }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogDescription: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <p>{children}</p>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
  }));

  ({ StripePaymentModal } =
    await import('@/components/StripePaymentModal'));
});

function createConfirmedHandlerMock() {
  return jest.fn();
}

function createFailedHandlerMock() {
  return jest.fn();
}

describe('StripePaymentModal', () => {
  beforeEach(() => {
    mockLoadStripe.mockImplementation(async () => ({}));
    mockStripe = {
      confirmCardPayment: jest.fn(async () => ({
        paymentIntent: null,
      })),
    };
    mockElements = {
      getElement: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockStripe = null;
    mockElements = null;
  });

  it('does not render without a client secret', () => {
    const { container } = render(
      <StripePaymentModal
        clientSecret=""
        open
        onClose={jest.fn()}
        onPaymentConfirmed={
          createConfirmedHandlerMock() as unknown as (
            paymentIntent: unknown | null
          ) => void
        }
      />
    );

    expect(container.childElementCount).toBe(0);
  });

  it('submits the card payment and reports confirmation', async () => {
    const user = userEvent.setup();
    const paymentIntent = {
      id: 'pi_success',
      status: 'succeeded',
    };
    const cardElement = { id: 'card-element' };
    const onPaymentConfirmed = createConfirmedHandlerMock();

    mockElements?.getElement.mockReturnValue(cardElement);
    mockStripe?.confirmCardPayment.mockImplementation(async () => ({
      paymentIntent,
    }));

    render(
      <StripePaymentModal
        clientSecret="cs_test_123"
        open
        onClose={jest.fn()}
        onPaymentConfirmed={
          onPaymentConfirmed as unknown as (
            paymentIntent: unknown | null
          ) => void
        }
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Pay securely' })
    );

    expect(mockElements?.getElement).toHaveBeenCalled();
    expect(mockStripe?.confirmCardPayment).toHaveBeenCalledWith(
      'cs_test_123',
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    await waitFor(() => {
      expect(onPaymentConfirmed).toHaveBeenCalledWith(paymentIntent);
    });
  });

  it('shows retryable validation errors without calling the failure handler', async () => {
    const user = userEvent.setup();
    const onPaymentFailed = createFailedHandlerMock();

    mockElements?.getElement.mockReturnValue({ id: 'card-element' });
    mockStripe?.confirmCardPayment.mockImplementation(async () => ({
      error: {
        type: 'validation_error',
        message: 'Card number is incomplete.',
      },
      paymentIntent: null,
    }));

    render(
      <StripePaymentModal
        clientSecret="cs_test_validation"
        open
        onClose={jest.fn()}
        onPaymentConfirmed={
          createConfirmedHandlerMock() as unknown as (
            paymentIntent: unknown | null
          ) => void
        }
        onPaymentFailed={
          onPaymentFailed as unknown as (
            errorMessage: string,
            paymentIntent: unknown | null
          ) => void
        }
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Pay securely' })
    );

    expect(
      await screen.findByText('Card number is incomplete.')
    ).toBeTruthy();
    expect(onPaymentFailed).not.toHaveBeenCalled();
  });

  it('switches to the declined state, reports failure, and lets the user close', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onPaymentFailed = createFailedHandlerMock();
    const paymentIntent = {
      id: 'pi_declined',
      status: 'requires_payment_method',
    };

    mockElements?.getElement.mockReturnValue({ id: 'card-element' });
    mockStripe?.confirmCardPayment.mockImplementation(async () => ({
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'generic_decline',
        message: 'Your card was declined.',
      },
      paymentIntent,
    }));

    render(
      <StripePaymentModal
        clientSecret="cs_test_declined"
        open
        onClose={onClose}
        onPaymentConfirmed={
          createConfirmedHandlerMock() as unknown as (
            paymentIntent: unknown | null
          ) => void
        }
        onPaymentFailed={
          onPaymentFailed as unknown as (
            errorMessage: string,
            paymentIntent: unknown | null
          ) => void
        }
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Pay securely' })
    );

    await waitFor(() => {
      expect(onPaymentFailed).toHaveBeenCalledWith(
        'Your card was declined.',
        paymentIntent
      );
    });

    expect(
      await screen.findByText('Your card has been declined')
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
