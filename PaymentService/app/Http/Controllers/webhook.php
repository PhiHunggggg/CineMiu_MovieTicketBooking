<?php
require 'vendor/autoload.php';
use PayOS\PayOS;

// 1. Cấu hình các key lấy từ Dashboard PayOS
$payOS = new PayOS(
    "YOUR_CLIENT_ID", 
    "YOUR_API_KEY", 
    "YOUR_CHECKSUM_KEY"
);

// 2. Lấy dữ liệu từ body request
$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    http_response_code(400);
    exit("Invalid Request");
}

try {
    // 3. Xác thực Webhook bằng mã Checksum
    // Hàm này sẽ throw Exception nếu dữ liệu bị giả mạo
    $verifiedData = $payOS->verifyPaymentWebhookData($body);
    
    /* 
       Dữ liệu sau khi xác thực sẽ có dạng:
       {
         "orderCode": 123456,
         "amount": 50000,
         "description": "Thanh toan ve xem phim DH123",
         "transactionDateTime": "...",
         ...
       }
    */

    // 4. Gọi sang Microservice .NET Core (Dịch vụ Booking/Ticket)
    $orderCode = $verifiedData['orderCode'];
    
    // Gợi ý: Gọi nội bộ bằng cURL hoặc đẩy vào Message Queue
    $ch = curl_init("http://internal-booking-service:5000/api/v1/tickets/confirm");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'orderCode' => $orderCode,
        'status' => 'Paid',
        'provider' => 'VietQR'
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($statusCode == 200) {
        // Trả về 200 để PayOS biết đã xử lý xong và không gửi lại webhook nữa
        http_response_code(200);
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Internal service failed"]);
    }

} catch (\Exception $e) {
    // Nếu sai chữ ký hoặc lỗi xử lý
    http_response_code(403);
    echo json_encode(["status" => "fail", "message" => $e->getMessage()]);
}