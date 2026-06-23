<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Handle the incoming payment webhook from SePay.
     * SePay gửi header: Authorization: Apikey <your_api_key>
     */
    public function handle(Request $request)
    {
        Log::info('SePay Webhook Received:', $request->all());

        // 1. Verify Webhook Token (SePay dùng "Apikey" prefix)
        $webhookToken = env('SEPAY_WEBHOOK_TOKEN');
        $authHeader = $request->header('Authorization');

        Log::info("Webhook Auth Header: " . $authHeader);

        if ($webhookToken && $authHeader !== "Apikey {$webhookToken}") {
            Log::warning('SePay Webhook: Invalid token. Received: ' . $authHeader . ' | Expected: Apikey ' . $webhookToken);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // 2. Extract Data from SePay
        // SePay fields: transferAmount (số tiền), content (nội dung chuyển khoản)
        $amount = $request->input('transferAmount') ?? $request->input('amountIn') ?? 0;
        $description = $request->input('content') ?? $request->input('description') ?? '';
        $referenceCode = $request->input('referenceCode') ?? $request->input('id') ?? ('SEPAY_' . time());

        Log::info("SePay: amount={$amount}, content={$description}, ref={$referenceCode}");

        // 3. Match booking code from description (e.g., "BT20240516145933")
        preg_match('/BT[0-9]{10,}/', $description, $matches);
        $bookingCode = $matches[0] ?? null;

        if (!$bookingCode) {
            Log::warning('SePay Webhook: Could not find booking code in content: ' . $description);
            // Trả 200 để SePay không gửi lại
            return response()->json(['message' => 'Booking code not found in content', 'content' => $description], 200);
        }

        try {
            $backendUrl = env('BACKEND_API_URL', 'http://localhost:5000/api');

            // 4. Find Booking by Code in .NET Backend (không cần token vì endpoint không có [Authorize])
            $bookingResponse = Http::timeout(10)->get("{$backendUrl}/bookings/code/{$bookingCode}");

            Log::info("Backend GET booking/code response: " . $bookingResponse->status() . " | " . $bookingResponse->body());

            if ($bookingResponse->failed()) {
                Log::error("SePay Webhook: Booking not found in backend: {$bookingCode}");
                return response()->json(['message' => 'Booking not found in system'], 200);
            }

            $responseData = $bookingResponse->json();
            $booking = $responseData['booking'] ?? $responseData['Booking'] ?? $responseData;
            // .NET trả camelCase qua ocelot hoặc Pascal trực tiếp
            $bookingId = $booking['bookingId'] ?? $booking['BookingId'] ?? null;

            if (!$bookingId) {
                Log::error("SePay Webhook: Could not extract bookingId from response: " . json_encode($responseData));
                return response()->json(['message' => 'Invalid booking data'], 200);
            }

            // 5. Confirm Payment to .NET Backend
            $paymentData = [
                'methodId'       => 6, // 6 = VietQR/Bank Transfer
                'amount'         => $amount,
                'status'         => 'success',
                'transactionRef' => $referenceCode,
                'paidAt'         => now()->toIso8601String(),
                'gatewayResponse'=> json_encode($request->all()),
            ];

            Log::info("Confirming payment for booking #{$bookingId}: ", $paymentData);

            $confirmResponse = Http::timeout(10)->post("{$backendUrl}/bookings/{$bookingId}/payments", $paymentData);

            Log::info("Backend POST payment response: " . $confirmResponse->status() . " | " . $confirmResponse->body());

            if ($confirmResponse->successful()) {
                Log::info("SePay Webhook: Successfully confirmed booking {$bookingCode} (ID: {$bookingId})");
                return response()->json(['success' => true, 'bookingId' => $bookingId]);
            } else {
                Log::error("SePay Webhook: Failed to confirm booking. Backend said: " . $confirmResponse->body());
                return response()->json(['message' => 'Failed to update backend'], 500);
            }

        } catch (\Exception $e) {
            Log::error("SePay Webhook Exception: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
            return response()->json(['message' => 'Internal Server Error'], 500);
        }
    }
}
