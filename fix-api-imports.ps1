# fix-api-imports.ps1
Write-Host "Fixing API imports in frontend..." -ForegroundColor Yellow

$files = @(
    "frontend\src\pages\index.tsx",
    "frontend\src\pages\catalog\[id].tsx",
    "frontend\src\pages\product\[id].tsx",
    "frontend\src\pages\checkout.tsx",
    "frontend\src\pages\register.tsx",
    "frontend\src\pages\admin\ortomats\index.tsx",
    "frontend\src\pages\admin\products\index.tsx",
    "frontend\src\pages\courier\refill.tsx"
)

$replacements = @{
    "import { ortomatsApi } from" = "import { api } from"
    "import { productsApi } from" = "import { api } from"
    "import { ordersApi } from" = "import { api } from"
    "import { usersApi } from" = "import { api } from"
    "ortomatsApi.getAll" = "api.getOrtomats"
    "ortomatsApi.getOne" = "api.getOrtomat"
    "ortomatsApi.getCatalog" = "api.getOrtomatCatalog"
    "ortomatsApi.getInventory" = "api.getOrtomatInventory"
    "ortomatsApi.create" = "api.createOrtomat"
    "ortomatsApi.update" = "api.updateOrtomat"
    "ortomatsApi.delete" = "api.deleteOrtomat"
    "ortomatsApi.refillCell" = "api.refillCell"
    "productsApi.getAll" = "api.getProducts"
    "productsApi.getOne" = "api.getProduct"
    "productsApi.create" = "api.createProduct"
    "productsApi.update" = "api.updateProduct"
    "productsApi.delete" = "api.deleteProduct"
    "ordersApi.create" = "api.createOrder"
    "ordersApi.processPayment" = "api.processPayment"
    "ordersApi.getOne" = "api.getOrder"
    "ordersApi.openCell" = "api.openCell"
    "usersApi.getDoctors" = "api.getDoctors"
    "usersApi.getCouriers" = "api.getCouriers"
    "usersApi.getAll" = "api.getUsers"
}

$totalChanges = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host ""
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw
        $fileChanges = 0
        
        foreach ($key in $replacements.Keys) {
            $value = $replacements[$key]
            $pattern = [regex]::Escape($key)
            $matches = ([regex]::Matches($content, $pattern)).Count
            
            if ($matches -gt 0) {
                $content = $content -replace $pattern, $value
                $fileChanges += $matches
                Write-Host "  Replaced '$key' with '$value' ($matches times)" -ForegroundColor Green
            }
        }
        
        if ($fileChanges -gt 0) {
            Set-Content $file -Value $content -NoNewline
            $totalChanges += $fileChanges
            Write-Host "  Saved $fileChanges changes" -ForegroundColor Green
        } else {
            Write-Host "  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host ""
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Complete! Total changes: $totalChanges" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart frontend: cd frontend && npm run dev"
Write-Host "  2. Open http://localhost:3000"
Write-Host "  3. Test the homepage"
Write-Host ""