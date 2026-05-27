# ╔══════════════════════════════════════════════════════════════════╗
# ║      SMARTBISTRO AI — TESTE DO PIPELINE DE 3 AGENTES            ║
# ║                                                                  ║
# ║  Simula submissão de formulário de pedido e valida o pipeline:   ║
# ║    1. Maître  → valida cliente, mesa, alergias, fila de pedidos  ║
# ║    2. Chefe   → sequência de preparação + desconto de stock      ║
# ║    3. Gerente → fatura com IVA + margens, objeto JSON final      ║
# ║    4. MySQL   → pedido, itens, fatura e pagamento persistidos    ║
# ║                                                                  ║
# ║  Endpoint: POST /orders/pipeline                                 ║
# ║                                                                  ║
# ║  Clientes reais (seed BD):                                       ║
# ║    id 1 → Hugo Neto   · id 2 → Ana Silva · id 3 → Joana Luz     ║
# ║                                                                  ║
# ║  Mesas reais (seed BD):                                          ║
# ║    T03 (id 3) · T04 (id 4) · T05 (id 5)                         ║
# ║                                                                  ║
# ║  Menu real (seed BD):                                            ║
# ║    id 1  Esparguete Bolonhesa  €12.50                            ║
# ║    id 2  Hamburguer Gourmet    €14.00                            ║
# ║    id 3  Bruschetta            € 7.50                            ║
# ║    id 4  Caesar Salad          € 9.00                            ║
# ║                                                                  ║
# ║  Uso:                                                            ║
# ║    .\test-agents.ps1                (porta 3000)                 ║
# ║    .\test-agents.ps1 -Port 3001     (porta custom)               ║
# ║    .\test-agents.ps1 -Verbose       (mostra pipeline completo)   ║
# ║    .\test-agents.ps1 -DelayBetween 15  (delay entre cenários)    ║
# ╚══════════════════════════════════════════════════════════════════╝

param(
    [int]   $Port          = 3000,
    [int]   $DelayBetween  = 15,    # segundos entre cenários (Gemini Free Tier = 10 RPM × agente)
    [int]   $PipelineTimeout = 120, # segundos máximos por chamada ao pipeline
    [switch]$Verbose       = $false
)

$BASE         = "http://localhost:$Port"
$PIPELINE_URL = "$BASE/orders/pipeline"

$script:ScenarioNum = 0
$script:Passed      = 0
$script:Failed      = 0

# ── Utilitários de output ─────────────────────────────────────────────────────

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║      SMARTBISTRO AI — TESTE DO PIPELINE DE 3 AGENTES            ║" -ForegroundColor Magenta
    Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Magenta
    Write-Host ("║  Endpoint : {0,-54}║" -f $PIPELINE_URL) -ForegroundColor Magenta
    Write-Host ("║  Timeout  : {0,-54}║" -f "${PipelineTimeout}s por cenário") -ForegroundColor Magenta
    Write-Host ("║  Delay    : {0,-54}║" -f "${DelayBetween}s entre cenários") -ForegroundColor Magenta
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
}

function Write-ScenarioHeader {
    param([string]$Title, [string]$Description)
    $script:ScenarioNum++
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  CENÁRIO $($script:ScenarioNum) — $Title" -ForegroundColor Cyan
    Write-Host "  $Description" -ForegroundColor DarkGray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Write-FormData {
    param([hashtable]$Form)
    Write-Host ""
    Write-Host "  📋 FORMULÁRIO SUBMETIDO" -ForegroundColor Yellow
    Write-Host ("     Cliente      : {0}" -f $Form.customer_id) -ForegroundColor White
    Write-Host ("     Mesa         : {0}" -f $(if ($Form.table_id) { "T0$($Form.table_id) (id $($Form.table_id))" } else { "— (Takeaway)" })) -ForegroundColor White
    Write-Host ("     Serviço      : {0}" -f $Form.service_type) -ForegroundColor White
    if ($Form.allergy_restrictions) {
        Write-Host ("     Alergias     : {0}" -f $Form.allergy_restrictions) -ForegroundColor DarkYellow
    }
    Write-Host "     Itens        :" -ForegroundColor White
    foreach ($item in $Form.items) {
        Write-Host ("       • {0} × {1}  €{2:F2}" -f $item.quantity, $item.name, $item.price) -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  ⏳ A aguardar pipeline (Maître → Chefe → Gerente)..." -ForegroundColor DarkGray
}

function Write-PipelineResult {
    param($Result)
    if (-not $Result) { return }

    Write-Host ""
    Write-Host "  📊 RESULTADO DO PIPELINE" -ForegroundColor Green

    if ($Result.order) {
        Write-Host ("     order_id     : {0}" -f $Result.order_id) -ForegroundColor White
        Write-Host ("     status       : {0}" -f $Result.order.order_status) -ForegroundColor White
    }
    if ($Result.financials) {
        $f = $Result.financials
        Write-Host ("     Subtotal     : €{0:F2}" -f $f.subtotal) -ForegroundColor White
        Write-Host ("     IVA ({0:P0}) : €{1:F2}" -f $f.taxRate, $f.taxAmount) -ForegroundColor White
        Write-Host ("     TOTAL        : €{0:F2}" -f $f.total) -ForegroundColor Cyan
    }
    if ($Result.invoice) {
        Write-Host ("     invoice_id   : {0}" -f $Result.invoice.id) -ForegroundColor White
    }
    if ($Result.payment) {
        Write-Host ("     payment_id   : {0}  [{1}]" -f $Result.payment.id, $Result.payment.payment_status) -ForegroundColor White
    }

    if ($Verbose -and $Result.pipeline) {
        Write-Host ""
        Write-Host "  🔍 PIPELINE DETALHADO" -ForegroundColor DarkGray
        if ($Result.pipeline.validated) {
            Write-Host "     [Maître — Validated]" -ForegroundColor DarkGray
            Write-Host ("     {0}" -f ($Result.pipeline.validated | ConvertTo-Json -Depth 3 -Compress)) -ForegroundColor DarkGray
        }
        if ($Result.pipeline.sequenced) {
            Write-Host "     [Chefe — Sequenced]" -ForegroundColor DarkGray
            Write-Host ("     {0}" -f ($Result.pipeline.sequenced | ConvertTo-Json -Depth 3 -Compress)) -ForegroundColor DarkGray
        }
    }
}

function Write-Pass { param([string]$Msg) Write-Host "  ✅ $Msg" -ForegroundColor Green; $script:Passed++ }
function Write-Fail { param([string]$Msg) Write-Host "  ❌ $Msg" -ForegroundColor Red;  $script:Failed++ }
function Write-Info { param([string]$Msg) Write-Host "  ℹ️  $Msg" -ForegroundColor DarkYellow }

# ── Função principal — chama o pipeline e valida ──────────────────────────────
function Invoke-Pipeline {
    param(
        [hashtable]$FormData,
        [int]      $ExpectStatus  = 201,   # HTTP status code esperado
        [double]   $ExpectTotal   = -1,    # total financeiro esperado (-1 = não valida)
        [string]   $ExpectField   = $null  # campo esperado na resposta
    )

    Write-FormData $FormData

    $json = $FormData | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod `
            -Uri         $PIPELINE_URL `
            -Method      POST `
            -Body        $json `
            -ContentType "application/json" `
            -TimeoutSec  $PipelineTimeout `
            -ErrorAction Stop

        Write-PipelineResult $response

        # ── Validações ──────────────────────────────────────────────────────────

        # 1. success flag
        if (-not $response.success) {
            Write-Fail "Pipeline retornou success=false: $($response.error)"
            return $null
        }

        # 2. order_id criado na BD
        if (-not $response.order_id) {
            Write-Fail "order_id não foi criado na BD"
            return $null
        }

        # 3. invoice existe
        if (-not $response.invoice) {
            Write-Fail "Fatura não foi criada"
            return $null
        }

        # 4. payment existe
        if (-not $response.payment) {
            Write-Fail "Pagamento não foi registado"
            return $null
        }

        # 5. total financeiro (se especificado)
        if ($ExpectTotal -ge 0) {
            $actualTotal = [double]$response.financials.total
            $diff = [Math]::Abs($actualTotal - $ExpectTotal)
            if ($diff -gt 0.01) {
                Write-Fail "Total esperado: €$($ExpectTotal.ToString('F2'))  ·  Obtido: €$($actualTotal.ToString('F2'))"
                return $response
            }
            Write-Pass ("Total correcto: €{0:F2}  (subtotal €{1:F2} + IVA €{2:F2})" -f `
                $response.financials.total, $response.financials.subtotal, $response.financials.taxAmount)
        }

        Write-Pass ("Pipeline concluído — order_id=$($response.order_id), invoice_id=$($response.invoice.id), payment_id=$($response.payment.id)")
        return $response

    } catch {
        # ── Extrair status code e body do erro HTTP ─────────────────────────────
        # PS 5.1: o body JSON do erro está em $_.ErrorDetails.Message
        # Fallback: lê o stream de resposta manualmente
        $statusCode = $null
        $errBody    = $null
        $errMessage = $_.Exception.Message

        # Status code
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        # Body: tenta .ErrorDetails primeiro (PS 5.1 popula automaticamente)
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try { $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue } catch {}
            if (-not $errBody) { $errMessage = $_.ErrorDetails.Message }
        }

        # Fallback: lê stream da resposta
        if (-not $errBody -and $_.Exception.Response) {
            try {
                $stream  = $_.Exception.Response.GetResponseStream()
                $reader  = [System.IO.StreamReader]::new($stream)
                $raw     = $reader.ReadToEnd()
                $reader.Dispose()
                $errBody = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                if (-not $errBody) { $errMessage = $raw }
            } catch {}
        }

        $displayMsg = if ($errBody -and $errBody.error) { $errBody.error } else { $errMessage }

        if ($statusCode -and $statusCode -eq $ExpectStatus) {
            # Status esperado (ex: 400 numa validação de erro)
            Write-Pass "HTTP $statusCode conforme esperado — $displayMsg"
            return @{ status = $statusCode; body = $errBody }
        }

        Write-Fail "Erro HTTP $($statusCode ?? '?') — $displayMsg"
        return $null
    }
}

# ══════════════════════════════════════════════════════════════════════════════
#  PRÉ-REQUISITO — Health Check
# ══════════════════════════════════════════════════════════════════════════════

Write-Banner

Write-Host "── PRÉ-REQUISITO: HEALTH CHECK ─────────────────────────────────────" -ForegroundColor DarkCyan
try {
    $hc = Invoke-RestMethod -Uri "$BASE/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Pass "Servidor online — $($hc.message)"
} catch {
    Write-Fail "Servidor offline em $BASE — inicia o backend antes de correr os testes"
    Write-Host ""
    Write-Host "  npm start  (em backend/)" -ForegroundColor DarkYellow
    exit 1
}

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 1 — MESA DINE-IN (Ana Silva, T03)
#  Cliente real: Ana Silva (id 2, ana@dev.com)
#  Mesa real   : T03 (id 3, 4 lugares, Available)
#  Itens reais : Esparguete Bolonhesa (id 1, €12.50) + Hamburguer Gourmet (id 2, €14.00)
#  Esperado    : subtotal €26.50  ·  IVA 13% €3.45  ·  total €29.95
# ══════════════════════════════════════════════════════════════════════════════

Write-ScenarioHeader "MESA DINE-IN — Ana Silva, T03" `
    "Maître valida cliente e mesa · Chefe sequencia e verifica stock · Gerente gera fatura"

$form1 = @{
    customer_id          = 2
    table_id             = 3
    service_type         = "Dine-In"
    allergy_restrictions = $null
    payment_method       = "Pending"
    items                = @(
        @{ item_id = 1; name = "Esparguete Bolonhesa"; quantity = 1; price = 12.50 },
        @{ item_id = 2; name = "Hamburguer Gourmet";   quantity = 1; price = 14.00 }
    )
}

$r1 = Invoke-Pipeline -FormData $form1 -ExpectStatus 201 -ExpectTotal 29.95

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 2 — MESA COM RESTRIÇÕES ALIMENTARES (Hugo Neto, T04)
#  Cliente real: Hugo Neto (id 1, hugo@dev.com)
#  Mesa real   : T04 (id 4, 4 lugares, Available)
#  Itens reais : Bruschetta (id 3, €7.50) × 2
#  Alergias    : "Glúten"
#  Esperado    : subtotal €15.00  ·  IVA 13% €1.95  ·  total €16.95
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "MESA COM ALERGIAS — Hugo Neto, T04" `
    "Maître identifica restrição 'Glúten' · Chefe verifica alternativas · Gerente fatura"

$form2 = @{
    customer_id          = 1
    table_id             = 4
    service_type         = "Dine-In"
    allergy_restrictions = "Glúten"
    payment_method       = "Pending"
    items                = @(
        @{ item_id = 3; name = "Bruschetta"; quantity = 2; price = 7.50 }
    )
}

$r2 = Invoke-Pipeline -FormData $form2 -ExpectStatus 201 -ExpectTotal 16.95

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 3 — TAKEAWAY (Joana Luz, sem mesa)
#  Cliente real: Joana Luz (id 3, joana@dev.com)
#  Mesa        : null (Takeaway — sem ocupação de mesa)
#  Itens reais : Esparguete Bolonhesa (id 1, €12.50) × 2
#  Esperado    : subtotal €25.00  ·  IVA 13% €3.25  ·  total €28.25
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "TAKEAWAY — Joana Luz, sem mesa" `
    "service_type=Takeaway · Maître confirma sem mesa · Gerente gera fatura takeaway"

$form3 = @{
    customer_id          = 3
    table_id             = $null
    service_type         = "Takeaway"
    allergy_restrictions = $null
    payment_method       = "MB Way"
    items                = @(
        @{ item_id = 1; name = "Esparguete Bolonhesa"; quantity = 2; price = 12.50 }
    )
}

$r3 = Invoke-Pipeline -FormData $form3 -ExpectStatus 201 -ExpectTotal 28.25

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 4 — MULTI-ITEM COM DESCONTO (Ana Silva, T05)
#  Cliente real: Ana Silva (id 2)
#  Mesa real   : T05 (id 5, 6 lugares)
#  Itens       : 2×Esparguete + 1×Hamburguer + 1×Bruschetta
#  Desconto    : 10% (discount=0.10, discount_type=percent)
#  Esperado    : subtotal €46.50 · desconto €4.65 · base €41.85 · IVA 13% €5.44 · total €47.29
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "MULTI-ITEM COM DESCONTO 10% — Ana Silva, T05" `
    "4 itens · desconto de 10% aplicado em JS antes de chegar ao Gerente"

$form4 = @{
    customer_id          = 2
    table_id             = 5
    service_type         = "Dine-In"
    allergy_restrictions = $null
    payment_method       = "Card"
    discount             = 0.10
    discount_type        = "percent"
    items                = @(
        @{ item_id = 1; name = "Esparguete Bolonhesa"; quantity = 2; price = 12.50 },
        @{ item_id = 2; name = "Hamburguer Gourmet";   quantity = 1; price = 14.00 },
        @{ item_id = 3; name = "Bruschetta";           quantity = 1; price =  7.50 }
    )
}

# subtotal: 25 + 14 + 7.5 = 46.50
# desconto 10%: 4.65 → base tributável: 41.85
# IVA 13%: 5.44 → total: 47.29
$r4 = Invoke-Pipeline -FormData $form4 -ExpectStatus 201 -ExpectTotal 47.29

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 5 — VALIDAÇÃO: BODY SEM ITEMS (deve retornar HTTP 400)
#  Testa: controller rejeita payload inválido antes de chamar os agentes
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando 3s..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

Write-ScenarioHeader "VALIDAÇÃO — Body sem items (HTTP 400 esperado)" `
    "Controller deve rejeitar antes de chamar qualquer agente"

$formInvalid = @{
    customer_id  = 2
    table_id     = 3
    service_type = "Dine-In"
    # items ausente → deve retornar 400
}

$r5 = Invoke-Pipeline -FormData $formInvalid -ExpectStatus 400

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 6 — VALIDAÇÃO: SEM service_type (deve retornar HTTP 400)
# ══════════════════════════════════════════════════════════════════════════════

Write-ScenarioHeader "VALIDAÇÃO — Sem service_type (HTTP 400 esperado)" `
    "Controller deve rejeitar sem chamar agentes"

$formNoService = @{
    customer_id = 1
    table_id    = 3
    items       = @(@{ item_id = 1; name = "Esparguete Bolonhesa"; quantity = 1; price = 12.50 })
    # service_type ausente → deve retornar 400
}

$r6 = Invoke-Pipeline -FormData $formNoService -ExpectStatus 400

# ══════════════════════════════════════════════════════════════════════════════
#  RESUMO FINAL
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                        RESUMO FINAL                             ║" -ForegroundColor Magenta
Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Magenta
Write-Host ("║  Cenários  : {0,-54}║" -f $script:ScenarioNum) -ForegroundColor Magenta
Write-Host ("║  Passaram  : {0,-54}║" -f $script:Passed) -ForegroundColor Green
Write-Host ("║  Falharam  : {0,-54}║" -f $script:Failed) -ForegroundColor $(if ($script:Failed -eq 0) { "Green" } else { "Red" })
Write-Host "╠══════════════════════════════════════════════════════════════════╣" -ForegroundColor Magenta
if ($script:Failed -eq 0) {
    Write-Host "║  STATUS : ✅  TODOS OS CENÁRIOS PASSARAM                          ║" -ForegroundColor Green
} else {
    Write-Host ("║  STATUS : ❌  {0} CENÁRIO(S) FALHARAM                              ║" -f $script:Failed) -ForegroundColor Red
}
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Consulta na BD:" -ForegroundColor DarkGray
Write-Host "    GET $BASE/orders        — todos os pedidos" -ForegroundColor DarkGray
Write-Host "    GET $BASE/orders/pending — KDS — pedidos em cozinha" -ForegroundColor DarkGray
Write-Host "    GET $BASE/invoices      — todas as faturas" -ForegroundColor DarkGray
Write-Host "    GET $BASE/payments      — todos os pagamentos" -ForegroundColor DarkGray
Write-Host ""
