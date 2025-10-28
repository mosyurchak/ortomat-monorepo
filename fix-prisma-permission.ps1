# PowerShell скрипт для виправлення Prisma EPERM помилки
# fix-prisma-permission.ps1

Write-Host "🔧 Виправлення Prisma Permission Error..." -ForegroundColor Green
Write-Host ""

# 1. Зупиняємо всі Node.js процеси
Write-Host "📌 Крок 1: Зупинка всіх Node.js процесів..." -ForegroundColor Cyan

# Знаходимо всі процеси node
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Знайдено Node.js процеси. Зупиняю..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Node.js процеси зупинено" -ForegroundColor Green
} else {
    Write-Host "✓ Node.js процеси не запущені" -ForegroundColor Gray
}

# Також зупиняємо процеси ts-node
$tsNodeProcesses = Get-Process ts-node -ErrorAction SilentlyContinue
if ($tsNodeProcesses) {
    $tsNodeProcesses | Stop-Process -Force
    Write-Host "✅ ts-node процеси зупинено" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# 2. Очищаємо кеш Prisma
Write-Host ""
Write-Host "🗑️ Крок 2: Очищення Prisma кешу..." -ForegroundColor Cyan

# Перевіряємо чи ми в правильній папці
if (Test-Path "backend") {
    Set-Location backend
} elseif (-Not (Test-Path "prisma")) {
    Write-Host "❌ Не можу знайти папку з проектом!" -ForegroundColor Red
    Write-Host "Запустіть скрипт з кореневої папки проекту або з папки backend" -ForegroundColor Yellow
    exit 1
}

# Видаляємо папку .prisma
if (Test-Path "node_modules\.prisma") {
    Write-Host "Видаляю папку node_modules\.prisma..." -ForegroundColor White
    Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Папка .prisma видалена" -ForegroundColor Green
} else {
    Write-Host "✓ Папка .prisma не існує" -ForegroundColor Gray
}

# Видаляємо папку @prisma
if (Test-Path "node_modules\@prisma") {
    Write-Host "Видаляю папку node_modules\@prisma..." -ForegroundColor White
    Remove-Item -Path "node_modules\@prisma" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Папка @prisma видалена" -ForegroundColor Green
}

# 3. Перевстановлюємо Prisma
Write-Host ""
Write-Host "📦 Крок 3: Перевстановлення Prisma..." -ForegroundColor Cyan

$reinstall = Read-Host "Перевстановити Prisma? (y/n)"

if ($reinstall -eq 'y') {
    Write-Host "Видаляю Prisma пакети..." -ForegroundColor White
    npm uninstall prisma @prisma/client
    
    Write-Host "Встановлюю Prisma заново..." -ForegroundColor White
    npm install prisma --save-dev
    npm install @prisma/client
    
    Write-Host "✅ Prisma перевстановлено" -ForegroundColor Green
}

# 4. Генеруємо Prisma Client заново
Write-Host ""
Write-Host "🔄 Крок 4: Генерація Prisma Client..." -ForegroundColor Cyan

Write-Host "Генерую Prisma Client..." -ForegroundColor White
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client згенеровано успішно!" -ForegroundColor Green
} else {
    Write-Host "❌ Помилка при генерації!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Спробуйте альтернативний метод:" -ForegroundColor Yellow
    Write-Host "1. Закрийте VS Code" -ForegroundColor White
    Write-Host "2. Закрийте всі термінали" -ForegroundColor White
    Write-Host "3. Відкрийте новий PowerShell як Адміністратор" -ForegroundColor White
    Write-Host "4. Запустіть команди:" -ForegroundColor White
    Write-Host "   cd C:\Users\Laptopchik\ortomat-monorepo\backend" -ForegroundColor Gray
    Write-Host "   npx prisma generate" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Скрипт завершено!" -ForegroundColor Green
Write-Host ""
Write-Host "Тепер спробуйте запустити backend:" -ForegroundColor Cyan
Write-Host "npm run start:dev" -ForegroundColor White
