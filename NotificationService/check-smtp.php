<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;

Dotenv::createImmutable(__DIR__)->load();

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'];
    $mail->Port = (int) $_ENV['SMTP_PORT'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USERNAME'];
    $mail->Password = str_replace(' ', '', $_ENV['SMTP_PASSWORD']);
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

    if (!$mail->smtpConnect()) {
        throw new RuntimeException('SMTP connection or authentication failed');
    }

    $mail->smtpClose();
    echo "SMTP connection and authentication succeeded\n";
} catch (Throwable $exception) {
    fwrite(STDERR, "SMTP check failed: {$exception->getMessage()}\n");
    exit(1);
}
