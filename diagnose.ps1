# diagnose.ps1 - Повна діагностика LiqPay інтеграції

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$OrderId
)

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🔍 LIQPAY DIAGNOSTICS                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. Перевірка конфігурації
Write-Host "1️⃣ Checking configuration..." -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Uri "$BackendUrl/api/liqpay/check-config" -Method Get
    Write-Host "✅ Configuration:" -ForegroundColor Green
    Write-Host "   Backend URL: $($config.backendUrl)" -ForegroundColor White
    Write-Host "   Frontend URL: $($config.frontendUrl)" -ForegroundColor White
    Write-Host "   Callback URL: $($config.callbackUrl)" -ForegroundColor White
    Write-Host "   Has Public Key: $($config.hasPublicKey)" -ForegroundColor White
    Write-Host "   Has Private Key: $($config.hasPrivateKey)" -ForegroundColor White
    Write-Host "   Is Configured: $($config.isConfigured)" -ForegroundColor $(if($config.isConfigured) {"Green"} else {"Red"})
    
    if (-not $config.isConfigured) {
        Write-Host "   ⚠️  Configuration is INCOMPLETE!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Configuration check failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Перевірка доступності endpoint
Write-Host "2️⃣ Checking endpoint accessibility..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "$BackendUrl/api/liqpay/test-endpoint" -Method Get
    Write-Host "✅ Endpoint is accessible!" -ForegroundColor Green
    Write-Host "   Message: $($test.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Endpoint is NOT accessible!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 LiqPay won't be able to send callbacks!" -ForegroundColor Yellow
}

Write-Host ""

# 3. Тестовий callback (якщо є OrderId)
if ($OrderId) {
    Write-Host "3️⃣ Testing callback with Order ID: $OrderId..." -ForegroundColor Yellow
    try {
        $callback = Invoke-RestMethod -Uri "$BackendUrl/api/liqpay/test-callback/$OrderId" -Method Post
        Write-Host "✅ Test callback successful!" -ForegroundColor Green
        Write-Host "   Status: $($callback.status)" -ForegroundColor White
        
        # Перевіряємо статус після callback
        Start-Sleep -Seconds 2
        Write-Host "`n4️⃣ Checking payment status after callback..." -ForegroundColor Yellow
        try {
            $payment = Invoke-RestMethod -Uri "$BackendUrl/api/liqpay/status/$OrderId" -Method Get
            Write-Host "✅ Payment status:" -ForegroundColor Green
            Write-Host "   Order ID: $($payment.orderId)" -ForegroundColor White
            Write-Host "   Amount: $($payment.amount) UAH" -ForegroundColor White
            Write-Host "   Status: $($payment.status)" -ForegroundColor $(if($payment.status -eq "SUCCESS") {"Green"} else {"Yellow"})
            Write-Host "   Transaction ID: $($payment.transactionId)" -ForegroundColor White
            
            if ($payment.sales -and $payment.sales.Count -gt 0) {
                Write-Host "   ✅ Sale created!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  No sale found" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Payment status check failed!" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Test callback failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ✅ DIAGNOSTICS COMPLETE                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Підсумок
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. If endpoint is not accessible - check firewall/SSL" -ForegroundColor White
Write-Host "   2. If configuration is incomplete - check .env file" -ForegroundColor White
Write-Host "   3. Create a new payment and check backend logs" -ForegroundColor White
Write-Host "   4. Look for '=== CREATING PAYMENT ===' in logs`n" -ForegroundColor White