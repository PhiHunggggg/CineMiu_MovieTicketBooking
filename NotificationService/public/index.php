<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

Dotenv::createImmutable(dirname(__DIR__))->load();

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_SERVER['REQUEST_URI'] === '/health') {
    echo json_encode(['status' => 'ok']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

$configuredApiKey = $_ENV['INTERNAL_API_KEY'] ?? '';
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

if ($configuredApiKey === '' || !hash_equals($configuredApiKey, $apiKey)) {
    http_response_code(401);
    echo json_encode(['message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (
    !is_array($input) ||
    empty($input['to']) ||
    empty($input['subject']) ||
    empty($input['html'])
) {
    http_response_code(400);
    echo json_encode(['message' => 'to, subject and html are required']);
    exit;
}

if (!filter_var($input['to'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid recipient email']);
    exit;
}

try {
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'];
    $mail->Port = (int) $_ENV['SMTP_PORT'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USERNAME'];
    // Google displays app passwords in four-character groups; SMTP expects
    // the same 16 characters without the visual spaces.
    $mail->Password = str_replace(' ', '', $_ENV['SMTP_PASSWORD']);
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet = 'UTF-8';

    $mail->setFrom(
        $_ENV['SMTP_FROM_EMAIL'],
        $_ENV['SMTP_FROM_NAME']
    );

    $mail->addAddress($input['to']);
    $mail->isHTML(true);
    $mail->Subject = $input['subject'];
    $mail->Body = $input['html'];
    $mail->AltBody = $input['text'] ?? strip_tags($input['html']);

    $mail->send();

    echo json_encode(['success' => true]);
} catch (Throwable $exception) {
    error_log($exception->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to send email'
    ]);
}
