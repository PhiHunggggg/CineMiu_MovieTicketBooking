<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handle(Request $request)
    {
        Log::info('SePay Webhook Received:', $request->all());

        $webhookToken = env('SEPAY_WEBHOOK_TOKEN');
        $authHeader = $request->header('Authorization');

        if ($webhookToken && $authHeader !== "Apikey {$webhookToken}") {
            Log::warning('SePay Webhook: Invalid token. Received: ' . $authHeader);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $amount = $request->input('transferAmount') ?? $request->input('amountIn') ?? 0;
        $description = $request->input('content') ?? $request->input('description') ?? '';
        $referenceCode = $request->input('referenceCode') ?? $request->input('id') ?? ('SEPAY_' . time());

        Log::info("SePay parsed: amount={$amount}, content={$description}, ref={$referenceCode}");

        preg_match('/BT[0-9]{10,}/', $description, $matches);
        $bookingCode = $matches[0] ?? null;

        if (!$bookingCode) {
            Log::warning('SePay Webhook: Could not find booking code in content: ' . $description);
            return response()->json(['message' => 'Booking code not found in content', 'content' => $description], 200);
        }

        try {
            $backendUrl = rtrim(env('BACKEND_API_URL', 'http://localhost:5001/api'), '/');
            $paymentMethodId = (int) env('PAYMENT_METHOD_ID', 6);

            $bookingResponse = Http::timeout(10)->get("{$backendUrl}/bookings/code/{$bookingCode}");
            Log::info("Backend GET booking/code response: " . $bookingResponse->status() . " | " . $bookingResponse->body());

            if ($bookingResponse->failed()) {
                Log::error("SePay Webhook: Booking not found in backend: {$bookingCode}");
                return response()->json(['message' => 'Booking not found in system'], 200);
            }

            $responseData = $bookingResponse->json();
            $booking = $responseData['booking'] ?? $responseData['Booking'] ?? $responseData;
            $bookingId = $booking['bookingId'] ?? $booking['BookingId'] ?? null;

            if (!$bookingId) {
                Log::error("SePay Webhook: Could not extract bookingId from response: " . json_encode($responseData));
                return response()->json(['message' => 'Invalid booking data'], 200);
            }

            $paymentData = [
                'methodId' => $paymentMethodId,
                'amount' => $amount,
                'status' => 'success',
                'transactionRef' => $referenceCode,
                'paidAt' => now()->toIso8601String(),
                'gatewayResponse' => json_encode($request->all()),
            ];

            Log::info("Confirming payment for booking #{$bookingId}: ", $paymentData);

            $confirmResponse = Http::timeout(10)->post("{$backendUrl}/bookings/{$bookingId}/payments", $paymentData);
            Log::info("Backend POST payment response: " . $confirmResponse->status() . " | " . $confirmResponse->body());

            if ($confirmResponse->successful()) {
                Log::info("SePay Webhook: Successfully confirmed booking {$bookingCode} (ID: {$bookingId})");
                return response()->json(['success' => true, 'bookingId' => $bookingId]);
            }

            if ($confirmResponse->status() === 404 && str_contains($confirmResponse->body(), 'Payment method not found or inactive')) {
                $fallbackMethodId = (int) env('PAYMENT_METHOD_FALLBACK_ID', 1);
                if ($fallbackMethodId > 0 && $fallbackMethodId !== $paymentMethodId) {
                    $paymentData['methodId'] = $fallbackMethodId;
                    Log::warning("Payment method {$paymentMethodId} is missing. Retrying with fallback method {$fallbackMethodId}.");

                    $confirmResponse = Http::timeout(10)->post("{$backendUrl}/bookings/{$bookingId}/payments", $paymentData);
                    Log::info("Backend POST payment fallback response: " . $confirmResponse->status() . " | " . $confirmResponse->body());

                    if ($confirmResponse->successful()) {
                        return response()->json([
                            'success' => true,
                            'bookingId' => $bookingId,
                            'fallbackMethodId' => $fallbackMethodId,
                        ]);
                    }
                }
            }

            if ($confirmResponse->status() === 400 && str_contains($confirmResponse->body(), 'Transaction reference already exists')) {
                Log::info("SePay Webhook: Duplicate transaction ignored: {$referenceCode}");
                return response()->json(['success' => true, 'duplicate' => true, 'bookingId' => $bookingId]);
            }

            Log::error("SePay Webhook: Failed to confirm booking. Backend said: " . $confirmResponse->body());
            return response()->json([
                'message' => 'Failed to update backend',
                'backendStatus' => $confirmResponse->status(),
                'backendBody' => $confirmResponse->json() ?? $confirmResponse->body(),
            ], 500);
        } catch (\Exception $e) {
            Log::error("SePay Webhook Exception: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
            return response()->json(['message' => 'Internal Server Error'], 500);
        }
    }
}
