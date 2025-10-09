# start-dev.ps1
Write-Host "Starting Ortomat Development Environment..." -ForegroundColor Green

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start:dev"

# Чекаємо 5 секунд поки backend запуститься
Start-Sleep -Seconds 5

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# Відкрити браузер
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Start-Process "test-websocket.html"

Write-Host "Development environment started!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "WebSocket Test: test-websocket.html" -ForegroundColor Cyan