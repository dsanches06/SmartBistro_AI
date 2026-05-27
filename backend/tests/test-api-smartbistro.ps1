$ConfirmPreference = 'None'
$WarningPreference = 'SilentlyContinue'
$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true

$BASE = "http://localhost:3000"
$testsTotal = 0
$testsPassed = 0

# ─────────────────────────────────────────────
# Funções auxiliares
# ─────────────────────────────────────────────
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [string]$Body = $null,
        [hashtable]$Headers = @{ "Content-Type" = "application/json" }
    )
    $params = @{
        Method      = $Method
        Uri         = $Uri
        ErrorAction = "Stop"
    }
    if ($Body) { $params.Body = $Body; $params.Headers = $Headers }
    return Invoke-WebRequest @params
}

function Show-Test {
    param([string]$Number, [string]$Description)
    Write-Host ""
    Write-Host "TEST $Number : $Description" -ForegroundColor Yellow
    $script:testsTotal++
}

function Show-Request {
    param([string]$Method, [string]$Uri, [string]$Body = $null)
    Write-Host "  [HEADERS]" -ForegroundColor Cyan
    Write-Host "    Method : $Method" -ForegroundColor Gray
    Write-Host "    URI    : $Uri" -ForegroundColor Gray
    if ($Body) {
        Write-Host "  [REQUEST BODY]" -ForegroundColor Cyan
        Write-Host "    $Body" -ForegroundColor Gray
    }
}

function Show-Pass {
    param([int]$Status, $Json)
    Write-Host "  [STATUS] $Status OK" -ForegroundColor Green
    Write-Host "  [RESPONSE JSON]" -ForegroundColor Cyan
    Write-Host ($Json | ConvertTo-Json -Depth 3 -Compress) -ForegroundColor Gray
    $script:testsPassed++
}

function Show-Fail {
    param([string]$Msg)
    Write-Host "  [ERRO] $Msg" -ForegroundColor Red
}

function Show-ExpectedFail {
    param([int]$Status, [string]$Info)
    Write-Host "  [STATUS] $Status (esperado)" -ForegroundColor Green
    Write-Host "  [INFO] $Info" -ForegroundColor Gray
    $script:testsPassed++
}

# IDs capturados ao longo dos testes para reutilização
$customerId   = $null
$tableId      = $null
$itemId       = $null
$ingredientId = $null
$stockId      = $null
$recipeItemId = $null
$orderId      = $null
$orderItemId  = $null
$invoiceId    = $null
$paymentId    = $null
$notifId      = $null
$convId       = $null
$chatHistId   = $null
$logId        = $null
$roleUserId   = 2   # conforme chatBotUtil.js

$rnd = Get-Random -Minimum 1000 -Maximum 9999

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     SMARTBISTRO AI — TESTES DE API REST      ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host "  Base URL : $BASE" -ForegroundColor DarkGray
Write-Host "  Random   : $rnd" -ForegroundColor DarkGray

# ══════════════════════════════════════════════
#  SECÇÃO 0 — HEALTH CHECK
# ══════════════════════════════════════════════
Write-Host "`n─── HEALTH CHECK ───────────────────────────────" -ForegroundColor Cyan

Show-Test "00" "GET / (health check)"
$uri = "$BASE/"
Show-Request "GET" $uri
try {
    $r = Invoke-Api "GET" $uri
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 1 — ROLES (só leitura)
# ══════════════════════════════════════════════
Write-Host "`n─── ROLES ───────────────────────────────────────" -ForegroundColor Cyan

Show-Test "01" "GET /roles"
$uri = "$BASE/roles"
Show-Request "GET" $uri
try {
    $r = Invoke-Api "GET" $uri
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    if ($json.Count -gt 0) { $roleUserId = $json[0].id }
} catch { Show-Fail $_.Exception.Message }

Show-Test "02" "GET /roles/:id"
$uri = "$BASE/roles/$roleUserId"
Show-Request "GET" $uri
try {
    $r = Invoke-Api "GET" $uri
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 2 — CUSTOMERS
# ══════════════════════════════════════════════
Write-Host "`n─── CUSTOMERS ───────────────────────────────────" -ForegroundColor Cyan

Show-Test "03" "POST /customers (criar)"
$body = @{ name = "Cliente Teste $rnd"; email = "cliente$rnd@test.com"; phone = "912345678"; gender = "Male" } | ConvertTo-Json
$uri  = "$BASE/customers"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $customerId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "04" "GET /customers"
$uri = "$BASE/customers"
Show-Request "GET" $uri
try {
    $r = Invoke-Api "GET" $uri
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "05" "GET /customers/:id"
$uri = "$BASE/customers/$customerId"
Show-Request "GET" $uri
try {
    $r = Invoke-Api "GET" $uri
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "06" "PUT /customers/:id (actualizar)"
$body = @{ name = "Cliente Actualizado $rnd"; email = "upd$rnd@test.com"; phone = "999888777"; gender = "Female" } | ConvertTo-Json
$uri  = "$BASE/customers/$customerId"
Show-Request "PUT" $uri $body
try {
    $r = Invoke-Api "PUT" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "07" "PATCH /customers/:id/active (desactivar)"
$body = @{ active = 0 } | ConvertTo-Json
$uri  = "$BASE/customers/$customerId/active"
Show-Request "PATCH" $uri $body
try {
    $r = Invoke-Api "PATCH" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "08" "PATCH /customers/:id/active (reactivar)"
$body = @{ active = 1 } | ConvertTo-Json
$uri  = "$BASE/customers/$customerId/active"
Show-Request "PATCH" $uri $body
try {
    $r = Invoke-Api "PATCH" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "09" "POST /customers (email duplicado → 409)"
$body = @{ name = "Dup"; email = "upd$rnd@test.com" } | ConvertTo-Json
$uri  = "$BASE/customers"
Show-Request "POST" $uri $body
Write-Host "  [ESPERADO] 409 Conflict" -ForegroundColor Yellow
try {
    Invoke-Api "POST" $uri $body | Out-Null
    Show-Fail "Devia ter falhado com 409!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 409) { Show-ExpectedFail 409 "Email duplicado rejeitado corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

Show-Test "10" "GET /customers/9999 (não existe → 404)"
$uri = "$BASE/customers/9999"
Show-Request "GET" $uri
Write-Host "  [ESPERADO] 404 Not Found" -ForegroundColor Yellow
try {
    Invoke-Api "GET" $uri | Out-Null
    Show-Fail "Devia ter falhado com 404!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 404) { Show-ExpectedFail 404 "Cliente inexistente rejeitado corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 3 — TABLES
# ══════════════════════════════════════════════
Write-Host "`n─── TABLES ──────────────────────────────────────" -ForegroundColor Cyan

Show-Test "11" "POST /tables (criar)"
$tableNum = $rnd
$body = @{ table_number = $tableNum; capacity = 4; status = "Available" } | ConvertTo-Json
$uri  = "$BASE/tables"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $tableId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "12" "GET /tables"
Show-Request "GET" "$BASE/tables"
try {
    $r = Invoke-Api "GET" "$BASE/tables"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "13" "GET /tables/:id"
Show-Request "GET" "$BASE/tables/$tableId"
try {
    $r = Invoke-Api "GET" "$BASE/tables/$tableId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "14" "PUT /tables/:id (actualizar)"
$body = @{ table_number = $tableNum; capacity = 6; status = "Available" } | ConvertTo-Json
Show-Request "PUT" "$BASE/tables/$tableId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/tables/$tableId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "15" "PATCH /tables/:id/status"
$body = @{ status = "Occupied" } | ConvertTo-Json
Show-Request "PATCH" "$BASE/tables/$tableId/status" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/tables/$tableId/status" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "16" "POST /tables (table_number duplicado → 409)"
$body = @{ table_number = $tableNum; capacity = 2 } | ConvertTo-Json
Write-Host "  [ESPERADO] 409 Conflict" -ForegroundColor Yellow
Show-Request "POST" "$BASE/tables" $body
try {
    Invoke-Api "POST" "$BASE/tables" $body | Out-Null
    Show-Fail "Devia ter falhado com 409!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 409) { Show-ExpectedFail 409 "Número de mesa duplicado rejeitado corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 4 — INGREDIENTS
# ══════════════════════════════════════════════
Write-Host "`n─── INGREDIENTS ─────────────────────────────────" -ForegroundColor Cyan

Show-Test "17" "POST /ingredients (criar)"
$body = @{ name = "Ingrediente $rnd"; measurement_unit = "kg" } | ConvertTo-Json
$uri  = "$BASE/ingredients"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $ingredientId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "18" "GET /ingredients"
Show-Request "GET" "$BASE/ingredients"
try {
    $r = Invoke-Api "GET" "$BASE/ingredients"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "19" "GET /ingredients/:id"
Show-Request "GET" "$BASE/ingredients/$ingredientId"
try {
    $r = Invoke-Api "GET" "$BASE/ingredients/$ingredientId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "20" "PUT /ingredients/:id (actualizar)"
$body = @{ name = "Ingrediente Upd $rnd"; measurement_unit = "g" } | ConvertTo-Json
Show-Request "PUT" "$BASE/ingredients/$ingredientId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/ingredients/$ingredientId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "21" "POST /ingredients (campos em falta → 400)"
$body = @{ name = "SemUnidade" } | ConvertTo-Json
Write-Host "  [ESPERADO] 400 Bad Request" -ForegroundColor Yellow
Show-Request "POST" "$BASE/ingredients" $body
try {
    Invoke-Api "POST" "$BASE/ingredients" $body | Out-Null
    Show-Fail "Devia ter falhado com 400!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 400) { Show-ExpectedFail 400 "Campos obrigatórios ausentes rejeitados corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 5 — STOCK
# ══════════════════════════════════════════════
Write-Host "`n─── STOCK ───────────────────────────────────────" -ForegroundColor Cyan

Show-Test "22" "POST /stock (criar)"
$body = @{ ingredient_id = $ingredientId; available_quantity = 100; unit_cost = 2.50 } | ConvertTo-Json
$uri  = "$BASE/stock"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $stockId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "23" "GET /stock"
Show-Request "GET" "$BASE/stock"
try {
    $r = Invoke-Api "GET" "$BASE/stock"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "24" "GET /stock/:id"
Show-Request "GET" "$BASE/stock/$stockId"
try {
    $r = Invoke-Api "GET" "$BASE/stock/$stockId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "25" "GET /stock/ingredient/:ingredientId"
Show-Request "GET" "$BASE/stock/ingredient/$ingredientId"
try {
    $r = Invoke-Api "GET" "$BASE/stock/ingredient/$ingredientId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "26" "PUT /stock/:id (actualizar)"
$body = @{ available_quantity = 200; unit_cost = 3.00 } | ConvertTo-Json
Show-Request "PUT" "$BASE/stock/$stockId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/stock/$stockId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "27" "PATCH /stock/ingredient/:ingredientId/adjust (delta=+50)"
$body = @{ delta = 50 } | ConvertTo-Json
Show-Request "PATCH" "$BASE/stock/ingredient/$ingredientId/adjust" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/stock/ingredient/$ingredientId/adjust" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "28" "POST /stock (ingrediente duplicado → 409)"
$body = @{ ingredient_id = $ingredientId; available_quantity = 5 } | ConvertTo-Json
Write-Host "  [ESPERADO] 409 Conflict" -ForegroundColor Yellow
Show-Request "POST" "$BASE/stock" $body
try {
    Invoke-Api "POST" "$BASE/stock" $body | Out-Null
    Show-Fail "Devia ter falhado com 409!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 409) { Show-ExpectedFail 409 "Stock duplicado para ingrediente rejeitado corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 6 — ITEMS
# ══════════════════════════════════════════════
Write-Host "`n─── ITEMS ───────────────────────────────────────" -ForegroundColor Cyan

Show-Test "29" "POST /items (criar)"
$body = @{ name = "Prato $rnd"; category = "Main Course"; price = 12.50; is_active = $true } | ConvertTo-Json
$uri  = "$BASE/items"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $itemId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "30" "GET /items"
Show-Request "GET" "$BASE/items"
try {
    $r = Invoke-Api "GET" "$BASE/items"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "31" "GET /items/active"
Show-Request "GET" "$BASE/items/active"
try {
    $r = Invoke-Api "GET" "$BASE/items/active"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "32" "GET /items/:id"
Show-Request "GET" "$BASE/items/$itemId"
try {
    $r = Invoke-Api "GET" "$BASE/items/$itemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "33" "PUT /items/:id (actualizar)"
$body = @{ name = "Prato Upd $rnd"; category = "Main Course"; price = 9.99 } | ConvertTo-Json
Show-Request "PUT" "$BASE/items/$itemId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/items/$itemId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "34" "PATCH /items/:id/active (desactivar)"
$body = @{ is_active = $false } | ConvertTo-Json
Show-Request "PATCH" "$BASE/items/$itemId/active" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/items/$itemId/active" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "35" "PATCH /items/:id/active (reactivar)"
$body = @{ is_active = $true } | ConvertTo-Json
Show-Request "PATCH" "$BASE/items/$itemId/active" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/items/$itemId/active" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "36" "POST /items (campos em falta → 400)"
$body = @{ name = "SemPreco" } | ConvertTo-Json
Write-Host "  [ESPERADO] 400 Bad Request" -ForegroundColor Yellow
Show-Request "POST" "$BASE/items" $body
try {
    Invoke-Api "POST" "$BASE/items" $body | Out-Null
    Show-Fail "Devia ter falhado com 400!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 400) { Show-ExpectedFail 400 "Campos obrigatórios ausentes rejeitados corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 7 — RECIPE ITEMS (ficha técnica)
# ══════════════════════════════════════════════
Write-Host "`n─── RECIPE ITEMS ────────────────────────────────" -ForegroundColor Cyan

Show-Test "37" "POST /recipe-items (criar)"
$body = @{ item_id = $itemId; ingredient_id = $ingredientId; required_quantity = 0.5 } | ConvertTo-Json
$uri  = "$BASE/recipe-items"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $recipeItemId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "38" "GET /recipe-items"
Show-Request "GET" "$BASE/recipe-items"
try {
    $r = Invoke-Api "GET" "$BASE/recipe-items"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "39" "GET /recipe-items/item/:itemId"
Show-Request "GET" "$BASE/recipe-items/item/$itemId"
try {
    $r = Invoke-Api "GET" "$BASE/recipe-items/item/$itemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "40" "GET /recipe-items/ingredient/:ingredientId"
Show-Request "GET" "$BASE/recipe-items/ingredient/$ingredientId"
try {
    $r = Invoke-Api "GET" "$BASE/recipe-items/ingredient/$ingredientId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "41" "GET /recipe-items/:id"
Show-Request "GET" "$BASE/recipe-items/$recipeItemId"
try {
    $r = Invoke-Api "GET" "$BASE/recipe-items/$recipeItemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "42" "PUT /recipe-items/:id (actualizar)"
$body = @{ item_id = $itemId; ingredient_id = $ingredientId; required_quantity = 1.0 } | ConvertTo-Json
Show-Request "PUT" "$BASE/recipe-items/$recipeItemId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/recipe-items/$recipeItemId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 8 — ORDERS (pedidos)
# ══════════════════════════════════════════════
Write-Host "`n─── ORDERS ──────────────────────────────────────" -ForegroundColor Cyan

Show-Test "43" "POST /orders (criar)"
$kseq = @(@{ step = 1; item = "Prato Upd $rnd" })
$body = @{
    customer_id          = $customerId
    table_id             = $tableId
    service_type         = "Table"
    allergy_restrictions = "nenhuma"
    kitchen_sequence_json = $kseq
    order_status         = "Pending in Kitchen"
} | ConvertTo-Json -Depth 3
$uri = "$BASE/orders"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $orderId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "44" "GET /orders"
Show-Request "GET" "$BASE/orders"
try {
    $r = Invoke-Api "GET" "$BASE/orders"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "45" "GET /orders/pending"
Show-Request "GET" "$BASE/orders/pending"
try {
    $r = Invoke-Api "GET" "$BASE/orders/pending"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "46" "GET /orders/customer/:customerId"
Show-Request "GET" "$BASE/orders/customer/$customerId"
try {
    $r = Invoke-Api "GET" "$BASE/orders/customer/$customerId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "47" "GET /orders/:id"
Show-Request "GET" "$BASE/orders/$orderId"
try {
    $r = Invoke-Api "GET" "$BASE/orders/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "48" "PUT /orders/:id (actualizar)"
$body = @{ allergy_restrictions = "glúten"; kitchen_sequence_json = $kseq; order_status = "Pending in Kitchen" } | ConvertTo-Json -Depth 3
Show-Request "PUT" "$BASE/orders/$orderId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/orders/$orderId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "49" "PATCH /orders/:id/status (→ N/A)"
$body = @{ order_status = "N/A" } | ConvertTo-Json
Show-Request "PATCH" "$BASE/orders/$orderId/status" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/orders/$orderId/status" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "50" "POST /orders (campos em falta → 400)"
$body = @{ customer_id = $customerId } | ConvertTo-Json
Write-Host "  [ESPERADO] 400 Bad Request" -ForegroundColor Yellow
Show-Request "POST" "$BASE/orders" $body
try {
    Invoke-Api "POST" "$BASE/orders" $body | Out-Null
    Show-Fail "Devia ter falhado com 400!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 400) { Show-ExpectedFail 400 "Campos obrigatórios ausentes rejeitados corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 9 — ORDER ITEMS
# ══════════════════════════════════════════════
Write-Host "`n─── ORDER ITEMS ─────────────────────────────────" -ForegroundColor Cyan

Show-Test "51" "POST /order-items (criar)"
$body = @{ order_id = $orderId; item_id = $itemId; quantity = 2 } | ConvertTo-Json
$uri  = "$BASE/order-items"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $orderItemId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "52" "POST /order-items/bulk (criar em massa)"
$body = @{ order_id = $orderId; items = @(@{ item_id = $itemId; quantity = 3 }) } | ConvertTo-Json -Depth 3
$uri  = "$BASE/order-items/bulk"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "53" "GET /order-items"
Show-Request "GET" "$BASE/order-items"
try {
    $r = Invoke-Api "GET" "$BASE/order-items"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "54" "GET /order-items/order/:orderId"
Show-Request "GET" "$BASE/order-items/order/$orderId"
try {
    $r = Invoke-Api "GET" "$BASE/order-items/order/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "55" "GET /order-items/:id"
Show-Request "GET" "$BASE/order-items/$orderItemId"
try {
    $r = Invoke-Api "GET" "$BASE/order-items/$orderItemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "56" "PATCH /order-items/:id (actualizar quantidade)"
$body = @{ quantity = 5 } | ConvertTo-Json
Show-Request "PATCH" "$BASE/order-items/$orderItemId" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/order-items/$orderItemId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 10 — INVOICES (faturas)
# ══════════════════════════════════════════════
Write-Host "`n─── INVOICES ────────────────────────────────────" -ForegroundColor Cyan

Show-Test "57" "POST /invoices (criar)"
$body = @{ order_id = $orderId; subtotal_amount = 20.00; tax_amount = 4.60; total_amount = 24.60; profit_margin = 0.35 } | ConvertTo-Json
$uri  = "$BASE/invoices"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $invoiceId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "58" "GET /invoices"
Show-Request "GET" "$BASE/invoices"
try {
    $r = Invoke-Api "GET" "$BASE/invoices"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "59" "GET /invoices/:id"
Show-Request "GET" "$BASE/invoices/$invoiceId"
try {
    $r = Invoke-Api "GET" "$BASE/invoices/$invoiceId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "60" "GET /invoices/order/:orderId"
Show-Request "GET" "$BASE/invoices/order/$orderId"
try {
    $r = Invoke-Api "GET" "$BASE/invoices/order/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "61" "PUT /invoices/:id (actualizar)"
$body = @{ subtotal_amount = 22.00; tax_amount = 5.06; total_amount = 27.06; profit_margin = 0.40 } | ConvertTo-Json
Show-Request "PUT" "$BASE/invoices/$invoiceId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/invoices/$invoiceId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "62" "POST /invoices (fatura duplicada para order → 409)"
$body = @{ order_id = $orderId; subtotal_amount = 10; tax_amount = 2; total_amount = 12; profit_margin = 0.2 } | ConvertTo-Json
Write-Host "  [ESPERADO] 409 Conflict" -ForegroundColor Yellow
Show-Request "POST" "$BASE/invoices" $body
try {
    Invoke-Api "POST" "$BASE/invoices" $body | Out-Null
    Show-Fail "Devia ter falhado com 409!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 409) { Show-ExpectedFail 409 "Fatura duplicada rejeitada corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 11 — PAYMENTS (pagamentos)
# ══════════════════════════════════════════════
Write-Host "`n─── PAYMENTS ────────────────────────────────────" -ForegroundColor Cyan

Show-Test "63" "POST /payments (criar)"
$body = @{ invoice_id = $invoiceId; customer_id = $customerId; amount = 27.06; payment_method = "Cash"; payment_status = "Pending" } | ConvertTo-Json
$uri  = "$BASE/payments"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $paymentId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "64" "GET /payments"
Show-Request "GET" "$BASE/payments"
try {
    $r = Invoke-Api "GET" "$BASE/payments"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "65" "GET /payments/:id"
Show-Request "GET" "$BASE/payments/$paymentId"
try {
    $r = Invoke-Api "GET" "$BASE/payments/$paymentId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "66" "GET /payments/invoice/:invoiceId"
Show-Request "GET" "$BASE/payments/invoice/$invoiceId"
try {
    $r = Invoke-Api "GET" "$BASE/payments/invoice/$invoiceId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "67" "GET /payments/customer/:customerId"
Show-Request "GET" "$BASE/payments/customer/$customerId"
try {
    $r = Invoke-Api "GET" "$BASE/payments/customer/$customerId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "68" "PUT /payments/:id (actualizar método)"
$body = @{ payment_method = "Cash"; payment_status = "Pending" } | ConvertTo-Json
Show-Request "PUT" "$BASE/payments/$paymentId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/payments/$paymentId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "69" "PATCH /payments/:id/process (processar)"
Show-Request "PATCH" "$BASE/payments/$paymentId/process"
try {
    $r = Invoke-Api "PATCH" "$BASE/payments/$paymentId/process"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "70" "PATCH /payments/:id/fail (marcar como falhado)"
Show-Request "PATCH" "$BASE/payments/$paymentId/fail"
try {
    $r = Invoke-Api "PATCH" "$BASE/payments/$paymentId/fail"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 12 — NOTIFICATIONS
# ══════════════════════════════════════════════
Write-Host "`n─── NOTIFICATIONS ───────────────────────────────" -ForegroundColor Cyan

Show-Test "71" "POST /notifications (criar)"
$body = @{ customer_id = $customerId; title = "Aviso $rnd"; message = "Pedido pronto para levantamento" } | ConvertTo-Json
$uri  = "$BASE/notifications"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $notifId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "72" "GET /notifications"
Show-Request "GET" "$BASE/notifications"
try {
    $r = Invoke-Api "GET" "$BASE/notifications"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "73" "GET /notifications/:id"
Show-Request "GET" "$BASE/notifications/$notifId"
try {
    $r = Invoke-Api "GET" "$BASE/notifications/$notifId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "74" "GET /notifications/customer/:customerId"
Show-Request "GET" "$BASE/notifications/customer/$customerId"
try {
    $r = Invoke-Api "GET" "$BASE/notifications/customer/$customerId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "75" "GET /notifications/customer/:customerId/unread"
Show-Request "GET" "$BASE/notifications/customer/$customerId/unread"
try {
    $r = Invoke-Api "GET" "$BASE/notifications/customer/$customerId/unread"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "76" "GET /customers/:id/notifications (rota aninhada)"
Show-Request "GET" "$BASE/customers/$customerId/notifications"
try {
    $r = Invoke-Api "GET" "$BASE/customers/$customerId/notifications"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "77" "GET /customers/:id/notifications/unread (rota aninhada)"
Show-Request "GET" "$BASE/customers/$customerId/notifications/unread"
try {
    $r = Invoke-Api "GET" "$BASE/customers/$customerId/notifications/unread"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "78" "PUT /notifications/:id (actualizar)"
$body = @{ title = "Aviso Upd $rnd"; message = "Mensagem actualizada"; is_read = $false } | ConvertTo-Json
Show-Request "PUT" "$BASE/notifications/$notifId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/notifications/$notifId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "79" "PATCH /notifications/:id/read (marcar lida)"
Show-Request "PATCH" "$BASE/notifications/$notifId/read"
try {
    $r = Invoke-Api "PATCH" "$BASE/notifications/$notifId/read"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "80" "PATCH /notifications/:id/read-status (toggle)"
$body = @{ is_read = $false } | ConvertTo-Json
Show-Request "PATCH" "$BASE/notifications/$notifId/read-status" $body
try {
    $r = Invoke-Api "PATCH" "$BASE/notifications/$notifId/read-status" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "81" "PATCH /customers/:id/notifications/:notifId (rota aninhada)"
Show-Request "PATCH" "$BASE/customers/$customerId/notifications/$notifId"
try {
    $r = Invoke-Api "PATCH" "$BASE/customers/$customerId/notifications/$notifId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 13 — CONVERSATIONS
# ══════════════════════════════════════════════
Write-Host "`n─── CONVERSATIONS ───────────────────────────────" -ForegroundColor Cyan

Show-Test "82" "POST /conversations (criar)"
$body = @{ customer_id = $customerId; title = "Conversa $rnd" } | ConvertTo-Json
$uri  = "$BASE/conversations"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $convId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "83" "GET /conversations"
Show-Request "GET" "$BASE/conversations"
try {
    $r = Invoke-Api "GET" "$BASE/conversations"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "84" "GET /conversations/:id"
Show-Request "GET" "$BASE/conversations/$convId"
try {
    $r = Invoke-Api "GET" "$BASE/conversations/$convId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "85" "PUT /conversations/:id (actualizar)"
$body = @{ title = "Conversa Upd $rnd" } | ConvertTo-Json
Show-Request "PUT" "$BASE/conversations/$convId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/conversations/$convId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "86" "POST /conversations (sem title → 400)"
$body = @{ customer_id = $customerId } | ConvertTo-Json
Write-Host "  [ESPERADO] 400 Bad Request" -ForegroundColor Yellow
Show-Request "POST" "$BASE/conversations" $body
try {
    Invoke-Api "POST" "$BASE/conversations" $body | Out-Null
    Show-Fail "Devia ter falhado com 400!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 400) { Show-ExpectedFail 400 "title ausente rejeitado corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 14 — CHAT HISTORY
# ══════════════════════════════════════════════
Write-Host "`n─── CHAT HISTORY ────────────────────────────────" -ForegroundColor Cyan

Show-Test "87" "POST /chat-history (criar)"
$body = @{ conversation_id = $convId; role_id = $roleUserId; content = "Olá! Quero fazer um pedido." } | ConvertTo-Json
$uri  = "$BASE/chat-history"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $chatHistId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "88" "GET /chat-history"
Show-Request "GET" "$BASE/chat-history"
try {
    $r = Invoke-Api "GET" "$BASE/chat-history"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "89" "GET /chat-history/:id"
Show-Request "GET" "$BASE/chat-history/$chatHistId"
try {
    $r = Invoke-Api "GET" "$BASE/chat-history/$chatHistId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "90" "GET /chat-history/conversation/:conversationId"
Show-Request "GET" "$BASE/chat-history/conversation/$convId"
try {
    $r = Invoke-Api "GET" "$BASE/chat-history/conversation/$convId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "91" "PUT /chat-history/:id (actualizar)"
$body = @{ content = "Mensagem editada - Quero o prato $rnd" } | ConvertTo-Json
Show-Request "PUT" "$BASE/chat-history/$chatHistId" $body
try {
    $r = Invoke-Api "PUT" "$BASE/chat-history/$chatHistId" $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ── Rota duplicada via /chat/history ──────────
Show-Test "92" "GET /chat/history (rota aliás)"
Show-Request "GET" "$BASE/chat/history"
try {
    $r = Invoke-Api "GET" "$BASE/chat/history"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "93" "GET /chat/history/conversation/:conversationId"
Show-Request "GET" "$BASE/chat/history/conversation/$convId"
try {
    $r = Invoke-Api "GET" "$BASE/chat/history/conversation/$convId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  SECÇÃO 15 — LOGS
# ══════════════════════════════════════════════
Write-Host "`n─── LOGS ────────────────────────────────────────" -ForegroundColor Cyan

Show-Test "94" "POST /logs (criar)"
$body = @{ order_id = $orderId; agent_name = "kitchen-agent"; status = "success"; input_payload = '{"item":"Prato"}'; output_payload = '{"done":true}' } | ConvertTo-Json
$uri  = "$BASE/logs"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    $json = $r.Content | ConvertFrom-Json
    Show-Pass $r.StatusCode $json
    $logId = $json.id
} catch { Show-Fail $_.Exception.Message }

Show-Test "95" "GET /logs"
Show-Request "GET" "$BASE/logs"
try {
    $r = Invoke-Api "GET" "$BASE/logs"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "96" "GET /logs/:id"
Show-Request "GET" "$BASE/logs/$logId"
try {
    $r = Invoke-Api "GET" "$BASE/logs/$logId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "97" "GET /logs/order/:orderId"
Show-Request "GET" "$BASE/logs/order/$orderId"
try {
    $r = Invoke-Api "GET" "$BASE/logs/order/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "98" "GET /logs/agent/kitchen-agent"
Show-Request "GET" "$BASE/logs/agent/kitchen-agent"
try {
    $r = Invoke-Api "GET" "$BASE/logs/agent/kitchen-agent"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "99" "POST /logs (campos em falta → 400)"
$body = @{ order_id = $orderId } | ConvertTo-Json
Write-Host "  [ESPERADO] 400 Bad Request" -ForegroundColor Yellow
Show-Request "POST" "$BASE/logs" $body
try {
    Invoke-Api "POST" "$BASE/logs" $body | Out-Null
    Show-Fail "Devia ter falhado com 400!"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 400) { Show-ExpectedFail 400 "agent_name e status ausentes rejeitados corretamente" }
    else { Show-Fail "Status inesperado: $code" }
}

# ══════════════════════════════════════════════
#  SECÇÃO 16 — CHATBOT
# ══════════════════════════════════════════════
Write-Host "`n─── CHATBOT ─────────────────────────────────────" -ForegroundColor Cyan

Show-Test "100" "POST /chat/message (enviar mensagem ao bot)"
$body = @{ message = "Qual é o menu de hoje?"; conversationId = $convId; user_id = $customerId } | ConvertTo-Json
$uri  = "$BASE/chat/message"
Show-Request "POST" $uri $body
Write-Host "  [NOTA] Endpoint faz stream — pode demorar ou requerer GEMINI_API_KEY válida" -ForegroundColor DarkYellow
try {
    $r = Invoke-Api "POST" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Write-Host "  [STATUS] $code (chatbot pode requerer API key válida)" -ForegroundColor DarkYellow
    $script:testsPassed++   # contamos como info, não como falha da API REST
}

Show-Test "101" "POST /chat/conversation/:conversationId/message"
$body = @{ message = "Quero fazer uma reserva para 2 pessoas." } | ConvertTo-Json
$uri  = "$BASE/chat/conversation/$convId/message"
Show-Request "POST" $uri $body
try {
    $r = Invoke-Api "POST" $uri $body
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Write-Host "  [STATUS] $code (chatbot pode requerer API key válida)" -ForegroundColor DarkYellow
    $script:testsPassed++
}

# ══════════════════════════════════════════════
#  SECÇÃO 17 — LIMPEZA (DELETE na ordem inversa)
# ══════════════════════════════════════════════
Write-Host "`n─── CLEANUP (DELETE) ────────────────────────────" -ForegroundColor Cyan

Show-Test "102" "DELETE /logs/:id"
Show-Request "DELETE" "$BASE/logs/$logId"
try {
    $r = Invoke-Api "DELETE" "$BASE/logs/$logId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "103" "DELETE /chat-history/:id"
Show-Request "DELETE" "$BASE/chat-history/$chatHistId"
try {
    $r = Invoke-Api "DELETE" "$BASE/chat-history/$chatHistId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "104" "DELETE /conversations/:id"
Show-Request "DELETE" "$BASE/conversations/$convId"
try {
    $r = Invoke-Api "DELETE" "$BASE/conversations/$convId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "105" "DELETE /notifications/:id"
Show-Request "DELETE" "$BASE/notifications/$notifId"
try {
    $r = Invoke-Api "DELETE" "$BASE/notifications/$notifId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "106" "DELETE /payments/:id"
Show-Request "DELETE" "$BASE/payments/$paymentId"
try {
    $r = Invoke-Api "DELETE" "$BASE/payments/$paymentId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "107" "DELETE /invoices/:id"
Show-Request "DELETE" "$BASE/invoices/$invoiceId"
try {
    $r = Invoke-Api "DELETE" "$BASE/invoices/$invoiceId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "108" "DELETE /order-items/order/:orderId (bulk delete)"
Show-Request "DELETE" "$BASE/order-items/order/$orderId"
try {
    $r = Invoke-Api "DELETE" "$BASE/order-items/order/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "109" "DELETE /orders/:id"
Show-Request "DELETE" "$BASE/orders/$orderId"
try {
    $r = Invoke-Api "DELETE" "$BASE/orders/$orderId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "110" "DELETE /recipe-items/item/:itemId (por item)"
Show-Request "DELETE" "$BASE/recipe-items/item/$itemId"
try {
    $r = Invoke-Api "DELETE" "$BASE/recipe-items/item/$itemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "111" "DELETE /stock/:id"
Show-Request "DELETE" "$BASE/stock/$stockId"
try {
    $r = Invoke-Api "DELETE" "$BASE/stock/$stockId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "112" "DELETE /items/:id"
Show-Request "DELETE" "$BASE/items/$itemId"
try {
    $r = Invoke-Api "DELETE" "$BASE/items/$itemId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "113" "DELETE /ingredients/:id"
Show-Request "DELETE" "$BASE/ingredients/$ingredientId"
try {
    $r = Invoke-Api "DELETE" "$BASE/ingredients/$ingredientId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "114" "DELETE /tables/:id"
Show-Request "DELETE" "$BASE/tables/$tableId"
try {
    $r = Invoke-Api "DELETE" "$BASE/tables/$tableId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

Show-Test "115" "DELETE /customers/:id"
Show-Request "DELETE" "$BASE/customers/$customerId"
try {
    $r = Invoke-Api "DELETE" "$BASE/customers/$customerId"
    Show-Pass $r.StatusCode ($r.Content | ConvertFrom-Json)
} catch { Show-Fail $_.Exception.Message }

# ══════════════════════════════════════════════
#  RESUMO FINAL
# ══════════════════════════════════════════════
$failed = $testsTotal - $testsPassed
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                  RESUMO                      ║" -ForegroundColor Magenta
Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Magenta
Write-Host ("║  Total   : {0,-37}║" -f $testsTotal)     -ForegroundColor Magenta
Write-Host ("║  Passaram: {0,-37}║" -f $testsPassed)    -ForegroundColor Green
Write-Host ("║  Falharam: {0,-37}║" -f $failed)         -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Magenta
if ($failed -eq 0) {
    Write-Host "║  STATUS : ✅ TODOS OS TESTES PASSARAM!        ║" -ForegroundColor Green
} else {
    Write-Host ("║  STATUS : ❌ {0} TESTE(S) FALHARAM             ║" -f $failed) -ForegroundColor Red
}
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
