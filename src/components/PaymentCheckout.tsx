"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type PaymentCheckoutProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  comboBookingId?: string;
  bookingName?: string;
  amount?: number;
};

type CheckoutData = {
  payment_id: string;
  checkout_data: {
    key?: string;
    order_id?: string;
    amount?: number;
    currency?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    order_token?: string;
    payment_session_id?: string;
  };
  amount: number;
};

type PaymentStatus =
  | "idle"
  | "initiating"
  | "processing"
  | "success"
  | "failed";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function PaymentCheckout({
  isOpen,
  onClose,
  bookingId,
  comboBookingId,
  bookingName,
  amount,
}: PaymentCheckoutProps) {
  const router = useRouter();

  const [status, setStatus] =
    useState<PaymentStatus>("idle");

  const [error, setError] =
    useState<string | null>(null);

  const [checkoutData, setCheckoutData] =
    useState<CheckoutData | null>(null);

  useEffect(() => {
    if (isOpen) {
      initiatePayment();
    }
  }, [isOpen]);

  const initiatePayment = async () => {
    if (!bookingId && !comboBookingId) {
      setError("Invalid booking");
      setStatus("failed");
      return;
    }

    setStatus("initiating");
    setError(null);

    try {
      const endpoint = bookingId
        ? `/api/bookings/${bookingId}/initiate-payment`
        : `/api/combo-packs/${comboBookingId}/initiate-payment`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: "upi",
        }),
      });

      // ------------------------------------------------------------
      // Make sure server returned JSON
      // ------------------------------------------------------------
      const contentType =
        response.headers.get("content-type");

      if (
        !contentType ||
        !contentType.includes("application/json")
      ) {
        const text = await response.text();

        console.error(
          "[PaymentCheckout] Non-JSON response:",
          text
        );

        throw new Error(
          "Server error: Unable to process payment request. Please try again."
        );
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to initiate payment"
        );
      }

      // ------------------------------------------------------------
      // Validate payment response from backend
      // ------------------------------------------------------------
      if (!data.payment_id) {
        console.error(
          "[PaymentCheckout] Missing payment_id:",
          data
        );

        throw new Error(
          "Payment ID was not returned by the server."
        );
      }

      if (
        !data.checkout_data ||
        typeof data.checkout_data !== "object"
      ) {
        console.error(
          "[PaymentCheckout] Invalid checkout_data:",
          data
        );

        throw new Error(
          "Invalid payment checkout data received from server."
        );
      }

      setCheckoutData(data);
      setStatus("processing");

      await openPaymentGateway(data);
    } catch (err: any) {
      console.error(
        "[PaymentCheckout] Initiate payment error:",
        err
      );

      setError(
        err?.message ||
        "Failed to initiate payment"
      );

      setStatus("failed");
    }
  };

  const openPaymentGateway = async (
    data: CheckoutData
  ) => {
    const { checkout_data, payment_id } = data;

    if (!checkout_data) {
      setError(
        "Payment checkout information is missing."
      );
      setStatus("failed");
      return;
    }

    // ------------------------------------------------------------
    // Razorpay
    // ------------------------------------------------------------
    if (checkout_data.key) {
      await openRazorpay(
        checkout_data,
        payment_id
      );
      return;
    }

    // ------------------------------------------------------------
    // Cashfree
    // ------------------------------------------------------------
    if (checkout_data.order_token) {
      openCashfree(
        checkout_data,
        payment_id
      );
      return;
    }

    console.error(
      "[PaymentCheckout] Unsupported checkout data:",
      checkout_data
    );

    setError(
      "Unsupported payment gateway"
    );

    setStatus("failed");
  };

  // ================================================================
  // RAZORPAY
  // ================================================================

  const openRazorpay = async (
    razorpayCheckoutData: CheckoutData["checkout_data"],
    paymentId: string
  ) => {
    try {
      // ------------------------------------------------------------
      // Validate server-created Razorpay data
      // ------------------------------------------------------------

      const razorpayKey =
        razorpayCheckoutData.key;

      const razorpayOrderId =
        razorpayCheckoutData.order_id;

      const razorpayAmount = Number(
        razorpayCheckoutData.amount
      );

      const razorpayCurrency =
        razorpayCheckoutData.currency || "INR";

      if (!razorpayKey) {
        throw new Error(
          "Razorpay key is missing from server response."
        );
      }

      if (!razorpayOrderId) {
        console.error(
          "[PaymentCheckout] Missing Razorpay order_id:",
          razorpayCheckoutData
        );

        throw new Error(
          "Razorpay order was not created correctly. Please try again."
        );
      }

      if (
        !Number.isFinite(razorpayAmount) ||
        razorpayAmount <= 0
      ) {
        console.error(
          "[PaymentCheckout] Invalid Razorpay amount:",
          razorpayCheckoutData.amount
        );

        throw new Error(
          "Invalid payment amount received from server."
        );
      }

      // ------------------------------------------------------------
      // Open checkout when Razorpay is already loaded
      // ------------------------------------------------------------

      if (window.Razorpay) {
        executeRazorpayPayment(
          window.Razorpay,
          {
            ...razorpayCheckoutData,
            key: razorpayKey,
            order_id: razorpayOrderId,
            amount: razorpayAmount,
            currency: razorpayCurrency,
          },
          paymentId
        );

        return;
      }

      // ------------------------------------------------------------
      // Check if Razorpay script is already being loaded
      // ------------------------------------------------------------

      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        ) as HTMLScriptElement | null;

      if (existingScript) {
        const handleLoad = () => {
          if (!window.Razorpay) {
            setError(
              "Razorpay checkout failed to initialize."
            );
            setStatus("failed");
            return;
          }

          executeRazorpayPayment(
            window.Razorpay,
            {
              ...razorpayCheckoutData,
              key: razorpayKey,
              order_id: razorpayOrderId,
              amount: razorpayAmount,
              currency: razorpayCurrency,
            },
            paymentId
          );
        };

        const handleError = () => {
          setError(
            "Failed to load payment gateway. Please try again."
          );
          setStatus("failed");
        };

        existingScript.addEventListener(
          "load",
          handleLoad,
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          handleError,
          { once: true }
        );

        return;
      }

      // ------------------------------------------------------------
      // Load Razorpay Checkout script
      // ------------------------------------------------------------

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => {
        if (!window.Razorpay) {
          setError(
            "Razorpay checkout failed to initialize."
          );
          setStatus("failed");
          return;
        }

        executeRazorpayPayment(
          window.Razorpay,
          {
            ...razorpayCheckoutData,
            key: razorpayKey,
            order_id: razorpayOrderId,
            amount: razorpayAmount,
            currency: razorpayCurrency,
          },
          paymentId
        );
      };

      script.onerror = () => {
        console.error(
          "[PaymentCheckout] Razorpay script failed to load."
        );

        setError(
          "Failed to load payment gateway. Please try again."
        );

        setStatus("failed");
      };

      document.body.appendChild(script);
    } catch (err: any) {
      console.error(
        "[PaymentCheckout] Razorpay initialization error:",
        err
      );

      setError(
        err?.message ||
        "Unable to initialize Razorpay."
      );

      setStatus("failed");
    }
  };

  // ================================================================
  // EXECUTE RAZORPAY
  // ================================================================

  const executeRazorpayPayment = (
    Razorpay: any,
    razorpayCheckoutData: CheckoutData["checkout_data"],
    paymentId: string
  ) => {
    const orderId =
      razorpayCheckoutData.order_id;

    const amount =
      Number(razorpayCheckoutData.amount);

    const currency =
      razorpayCheckoutData.currency || "INR";

    const key =
      razorpayCheckoutData.key;

    // ------------------------------------------------------------
    // Final validation before opening Razorpay
    // ------------------------------------------------------------

    if (!key) {
      setError(
        "Razorpay key is missing."
      );
      setStatus("failed");
      return;
    }

    if (!orderId) {
      setError(
        "Razorpay order ID is missing."
      );
      setStatus("failed");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Invalid Razorpay payment amount."
      );
      setStatus("failed");
      return;
    }

    // ------------------------------------------------------------
    // Razorpay options
    // IMPORTANT:
    // order_id comes from backend-created Razorpay Order
    // amount comes from backend
    // key comes from backend
    // ------------------------------------------------------------

    const options = {
      key,

      amount,

      currency,

      name: "Evigo",

      description:
        bookingName ||
        "Booking Payment",

      order_id: orderId,

      prefill: {
        name:
          razorpayCheckoutData.prefill?.name ||
          "",

        email:
          razorpayCheckoutData.prefill?.email ||
          "",

        contact:
          razorpayCheckoutData.prefill?.contact ||
          "",
      },

      theme: {
        color: "#06b6d4",
      },

      handler: async (
        response: any
      ) => {
        // ----------------------------------------------------------
        // Validate Razorpay response
        // ----------------------------------------------------------

        if (
          !response?.razorpay_payment_id
        ) {
          console.error(
            "[PaymentCheckout] Missing razorpay_payment_id:",
            response
          );

          setError(
            "Razorpay did not return a payment ID."
          );

          setStatus("failed");
          return;
        }

        if (
          !response?.razorpay_order_id
        ) {
          console.error(
            "[PaymentCheckout] Missing razorpay_order_id:",
            response
          );

          setError(
            "Razorpay did not return an order ID."
          );

          setStatus("failed");
          return;
        }

        // ----------------------------------------------------------
        // CRITICAL ORDER ID CHECK
        //
        // The order returned by Razorpay must be exactly the
        // same order created by our backend.
        // ----------------------------------------------------------

        if (
          response.razorpay_order_id !==
          orderId
        ) {
          console.error(
            "[PaymentCheckout] Razorpay order mismatch:",
            {
              expected: orderId,
              received:
                response.razorpay_order_id,
            }
          );

          setError(
            "Payment order verification failed. Please contact support."
          );

          setStatus("failed");
          return;
        }

        // ----------------------------------------------------------
        // Verify payment on server
        // ----------------------------------------------------------

        await verifyPayment(
          paymentId,
          response.razorpay_payment_id,
          response.razorpay_order_id,
          response.razorpay_signature
        );
      },

      modal: {
        ondismiss: () => {
          console.log(
            "[PaymentCheckout] Razorpay checkout dismissed."
          );

          setStatus("idle");
          setError(null);
        },
      },
    };

    try {
      const rzp =
        new Razorpay(options);

      // ------------------------------------------------------------
      // Razorpay payment failed event
      // ------------------------------------------------------------

      if (typeof rzp.on === "function") {
        rzp.on(
          "payment.failed",
          (response: any) => {
            console.error(
              "[PaymentCheckout] Razorpay payment.failed:",
              response?.error || response
            );

            const description =
              response?.error?.description ||
              "Payment failed. Please try again.";

            setError(description);
            setStatus("failed");
          }
        );
      }

      // ------------------------------------------------------------
      // Open Razorpay Checkout
      // ------------------------------------------------------------

      rzp.open();
    } catch (err: any) {
      console.error(
        "[PaymentCheckout] Razorpay open error:",
        err
      );

      setError(
        err?.message ||
        "Unable to open Razorpay checkout."
      );

      setStatus("failed");
    }
  };

  // ================================================================
  // CASHFREE
  // ================================================================

  const openCashfree = (
    cashfreeCheckoutData: CheckoutData["checkout_data"],
    paymentId: string
  ) => {
    void paymentId;

    // Cashfree checkout - redirect to their hosted page
    if (
      cashfreeCheckoutData.payment_session_id &&
      cashfreeCheckoutData.order_id
    ) {
      const cashfreeUrl =
        `https://payments.cashfree.com/orders/` +
        `${cashfreeCheckoutData.order_id}/payments`;

      window.location.href =
        cashfreeUrl;
    } else {
      setError(
        "Invalid Cashfree checkout data"
      );

      setStatus("failed");
    }
  };

  // ================================================================
  // VERIFY PAYMENT
  // ================================================================

  const verifyPayment = async (
    paymentId: string,
    gatewayPaymentId: string,
    gatewayOrderId: string,
    signature?: string
  ) => {
    setStatus("processing");
    setError(null);

    try {
      // ------------------------------------------------------------
      // Validate IDs before sending to server
      // ------------------------------------------------------------

      if (!paymentId) {
        throw new Error(
          "Internal payment ID is missing."
        );
      }

      if (!gatewayPaymentId) {
        throw new Error(
          "Gateway payment ID is missing."
        );
      }

      if (!gatewayOrderId) {
        throw new Error(
          "Gateway order ID is missing."
        );
      }

      if (!signature) {
        throw new Error(
          "Payment signature is missing."
        );
      }

      const response = await fetch(
        "/api/payments/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_id: paymentId,
            gateway_payment_id:
              gatewayPaymentId,
            gateway_order_id:
              gatewayOrderId,
            signature,
          }),
        }
      );

      // ------------------------------------------------------------
      // Handle non-JSON response
      // ------------------------------------------------------------

      const contentType =
        response.headers.get(
          "content-type"
        );

      if (
        !contentType ||
        !contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.text();

        console.error(
          "[PaymentCheckout] Verify payment - Non-JSON response:",
          text
        );

        throw new Error(
          "Server error: Unable to verify payment. Please contact support if payment was deducted."
        );
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Payment verification failed"
        );
      }

      // ------------------------------------------------------------
      // Payment successfully verified
      // ------------------------------------------------------------

      setStatus("success");

      // Redirect to success page
      setTimeout(() => {
        router.push(
          `/payment/success?payment_id=${encodeURIComponent(
            paymentId
          )}`
        );
      }, 1500);
    } catch (err: any) {
      console.error(
        "[PaymentCheckout] Verify payment error:",
        err
      );

      setError(
        err?.message ||
        "Payment verification failed"
      );

      setStatus("failed");
    }
  };

  // ================================================================
  // RETRY
  // ================================================================

  const handleRetry = () => {
    setStatus("idle");
    setError(null);

    initiatePayment();
  };

  // ================================================================
  // CLOSE
  // ================================================================

  const handleClose = () => {
    if (status === "processing") {
      // Don't allow closing while verification is processing
      return;
    }

    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-zinc-200 bg-white p-6 shadow-2xl">
        {/* ======================================================
            INITIATING
        ====================================================== */}

        {status === "initiating" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />

            <div className="text-sm font-bold text-zinc-900">
              Initiating payment...
            </div>

            <div className="text-xs text-zinc-500 text-center">
              Creating a secure Razorpay payment order.
            </div>
          </div>
        )}

        {/* ======================================================
            PROCESSING
        ====================================================== */}

        {status === "processing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-4xl">
              💳
            </div>

            <div className="text-sm font-bold text-zinc-900">
              Processing payment...
            </div>

            <div className="text-xs text-zinc-500 text-center">
              Please complete the payment in the secure
              Razorpay popup.
            </div>
          </div>
        )}

        {/* ======================================================
            SUCCESS
        ====================================================== */}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-5xl">
              ✅
            </div>

            <div className="text-lg font-black text-zinc-900">
              Payment Successful!
            </div>

            <div className="text-xs text-zinc-500">
              Redirecting to confirmation page...
            </div>
          </div>
        )}

        {/* ======================================================
            FAILED
        ====================================================== */}

        {status === "failed" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-5xl mb-4">
                ❌
              </div>

              <h3 className="text-xl font-black text-zinc-900">
                Payment Failed
              </h3>

              {error && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:opacity-90"
              >
                Retry Payment
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            IDLE
        ====================================================== */}

        {status === "idle" && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-4">
                💳
              </div>

              <h3 className="text-xl font-black text-zinc-900">
                Complete Payment
              </h3>

              {bookingName && (
                <p className="mt-2 text-sm font-medium text-zinc-600">
                  {bookingName}
                </p>
              )}

              {amount !== undefined && (
                <p className="mt-2 text-2xl font-black text-emerald-700">
                  ₹
                  {amount.toLocaleString(
                    "en-IN"
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={initiatePayment}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:opacity-90"
              >
                Pay Now
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}