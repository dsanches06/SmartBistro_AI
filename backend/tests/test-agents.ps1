# ╔══════════════════════════════════════════════════════════════════╗
# ║      SMARTBISTRO AI — TESTE DO PIPELINE DE 3 AGENTES            ║
# ║                                                                  ║
# ║  Simula pedidos em linguagem natural e valida o pipeline:        ║
# ║    1. Maître  → interpreta msg, escolhe mesa, mapeia itens       ║
# ║    2. Chefe   → sequência de preparação + desconto de stock      ║
# ║    3. Gerente → fatura com IVA + margens, objeto JSON final      ║
# ║    4. MySQL   → pedido, itens, fatura e pagamento persistidos    ║
# ║                                                                  ║
# ║  Endpoint: POST /orders/pipeline                                 ║
# ║                                                                  ║
# ║  Corpo mínimo:                                                   ║
# ║    { customer_id: <n>, message: "<pedido em linguagem natural>" }║
# ║                                                                  ║
# ║  Clientes reais (seed BD):                                       ║
# ║    id 1 → Hugo Neto   · id 2 → Ana Silva · id 3 → Joana Luz     ║
# ║                                                                  ║
# ║  Mesas reais (seed BD — o Maître escolhe):                       ║
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
    [int]   $Port            = 3000,
    [int]   $DelayBetween    = 15,    # segundos entre cenários (Gemini Free Tier = 10 RPM × agente)
    [int]   $PipelineTimeout = 120,   # segundos máximos por chamada ao pipeline
    [switch]$Verbose         = $false
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
    Write-Host "  📋 PEDIDO SUBMETIDO" -ForegroundColor Yellow
    Write-Host ("     Cliente      : id {0}" -f $Form.customer_id) -ForegroundColor White
    Write-Host ("     Mensagem     : `"{0}`"" -f $Form.message) -ForegroundColor Cyan
    if ($Form.ContainsKey("discount") -and $Form.discount -gt 0) {
        Write-Host ("     Desconto     : {0:P0} ({1})" -f $Form.discount, $Form.discount_type) -ForegroundColor DarkYellow
    }
    if ($Form.ContainsKey("payment_method") -and $Form.payment_method) {
        Write-Host ("     Pagamento    : {0}" -f $Form.payment_method) -ForegroundColor White
    }
    Write-Host ""
    Write-Host "  ⏳ A aguardar pipeline (Maître → Chefe → Gerente)..." -ForegroundColor DarkGray
}

function Write-PipelineResult {
    param($Result)
    if (-not $Result) { return }

    Write-Host ""
    Write-Host "  📊 RESULTADO DO PIPELINE" -ForegroundColor Green

    if ($Result.pipeline -and $Result.pipeline.validated) {
        $v = $Result.pipeline.validated
        $mesaLabel = if ($v.table_id) { "T0$($v.table_id) (id $($v.table_id))" } else { "— (Takeaway)" }
        Write-Host ("     Mesa         : {0}" -f $mesaLabel) -ForegroundColor White
        Write-Host ("     Serviço      : {0}" -f $v.service_type) -ForegroundColor White
        if ($v.items) {
            Write-Host "     Itens        :" -ForegroundColor White
            foreach ($item in $v.items) {
                Write-Host ("       • {0} × {1}  €{2:F2}" -f $item.quantity, $item.name, $item.price) -ForegroundColor Gray
            }
        }
        if ($v.allergy_restrictions) {
            Write-Host ("     Alergias     : {0}" -f $v.allergy_restrictions) -ForegroundColor DarkYellow
        }
        if ($v.notes) {
            Write-Host ("     Nota Maître  : {0}" -f $v.notes) -ForegroundColor DarkGray
        }
    }

    if ($Result.order) {
        Write-Host ("     order_id     : {0}" -f $Result.order_id) -ForegroundColor White
        Write-Host ("     status       : {0}" -f $Result.order.order_status) -ForegroundColor White
    }
    if ($Result.financials) {
        $f = $Result.financials
        Write-Host ("     Subtotal     : €{0:F2}" -f $f.subtotal) -ForegroundColor White
        if ($f.discount -gt 0) {
            Write-Host ("     Desconto     : -€{0:F2}" -f $f.discount) -ForegroundColor DarkYellow
        }
        Write-Host ("     IVA ({0:P0})  : €{1:F2}" -f $f.taxRate, $f.taxAmount) -ForegroundColor White
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
        [int]      $ExpectStatus = 201,   # HTTP status code esperado
        [double]   $ExpectTotal  = -1,    # total financeiro esperado (-1 = não valida)
        [string]   $ExpectField  = $null  # campo esperado na resposta
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

        # 5. Maître atribuiu mesa/serviço
        if ($response.pipeline -and $response.pipeline.validated) {
            $v = $response.pipeline.validated
            if (-not $v.service_type) {
                Write-Fail "Maître não determinou service_type"
                return $response
            }
            Write-Info ("Maître → {0}  ·  mesa: {1}  ·  itens: {2}" -f `
                $v.service_type,
                $(if ($v.table_id) { "T0$($v.table_id)" } else { "Takeaway" }),
                $v.items.Count)
        }

        # 6. total financeiro (se especificado)
        if ($ExpectTotal -ge 0) {
            $actualTotal = [double]$response.financials.total
            $diff = [Math]::Abs($actualTotal - $ExpectTotal)
            if ($diff -gt 0.02) {
                Write-Fail ("Total esperado: €{0:F2}  ·  Obtido: €{1:F2}" -f $ExpectTotal, $actualTotal)
                return $response
            }
            Write-Pass ("Total correcto: €{0:F2}  (subtotal €{1:F2} + IVA €{2:F2})" -f `
                $response.financials.total, $response.financials.subtotal, $response.financials.taxAmount)
        }

        Write-Pass ("Pipeline concluído — order_id=$($response.order_id), invoice_id=$($response.invoice.id), payment_id=$($response.payment.id)")
        return $response

    } catch {
        # ── Extrair status code e body do erro HTTP ─────────────────────────────
        $statusCode = $null
        $errBody    = $null
        $errMessage = $_.Exception.Message

        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try { $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue } catch {}
            if (-not $errBody) { $errMessage = $_.ErrorDetails.Message }
        }

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
            Write-Pass "HTTP $statusCode conforme esperado — $displayMsg"
            return @{ status = $statusCode; body = $errBody }
        }

        $codeDisplay = if ($statusCode) { $statusCode } else { '?' }
        Write-Fail "Erro HTTP $codeDisplay — $displayMsg"
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
#  CENÁRIO 1 — JANTAR DE CASAL (Ana Silva, Dine-In)
#  O Maître detecta "jantar", "eu e a minha esposa" (2 pessoas), escolhe mesa,
#  mapeia "espargute" → Esparguete Bolonhesa (€12.50) e "hamburg" → Hamburguer Gourmet (€14.00)
#  Esperado (se mapeamento correcto): subtotal €26.50 · IVA 13% €3.45 · total €29.95
# ══════════════════════════════════════════════════════════════════════════════

Write-ScenarioHeader "JANTAR DE CASAL — Ana Silva, Dine-In" `
    "Maître detecta 2 pessoas, escolhe mesa, mapeia esparguete+hamburguer do menu"

$form1 = @{
    customer_id    = 2
    message        = "eu e a minha esposa queremos jantar e queremos espargute e hamburg"
    payment_method = "MB Way"
}

$r1 = Invoke-Pipeline -FormData $form1 -ExpectStatus 201 -ExpectTotal 29.95

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 2 — JANTAR COM RESTRIÇÃO ALIMENTAR (Hugo Neto, Dine-In)
#  Maître detecta alergia a glúten e mapeia "duas bruschettas" → Bruschetta × 2 (€7.50 cada)
#  Esperado: subtotal €15.00 · IVA 13% €1.95 · total €16.95
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "JANTAR COM ALERGIA — Hugo Neto, Dine-In" `
    "Maître regista restrição 'Glúten' · Chefe verifica alternativas · Gerente fatura"

$form2 = @{
    customer_id    = 1
    message        = "quero jantar, sou alérgico a glúten, quero duas bruschettas"
    payment_method = "Cash"
}

$r2 = Invoke-Pipeline -FormData $form2 -ExpectStatus 201 -ExpectTotal 16.95

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 3 — TAKEAWAY (Joana Luz, sem mesa)
#  Maître detecta "para levar" → Takeaway, sem atribuição de mesa
#  "dois esparguetes" → Esparguete Bolonhesa × 2 (€12.50 cada)
#  Esperado: subtotal €25.00 · IVA 13% €3.25 · total €28.25
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "TAKEAWAY — Joana Luz, sem mesa" `
    "Maître detecta Takeaway, não atribui mesa · Gerente gera fatura takeaway"

$form3 = @{
    customer_id    = 3
    message        = "quero dois esparguetes bolonhesa para levar"
    payment_method = "MB Way"
}

$r3 = Invoke-Pipeline -FormData $form3 -ExpectStatus 201 -ExpectTotal 28.25

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 4 — MESA PARA GRUPO COM DESCONTO (Ana Silva, Dine-In)
#  Maître detecta grupo de 4, escolhe mesa com capacidade adequada
#  "2 esparguetes, 1 hamburguer e 1 bruschetta"
#  Desconto 10% passado como parâmetro extra (não na mensagem — calcula em JS)
#  Esperado: subtotal €46.50 · desconto €4.65 · base €41.85 · IVA 13% €5.44 · total €47.29
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando ${DelayBetween}s entre cenários..." -ForegroundColor DarkGray
Start-Sleep -Seconds $DelayBetween

Write-ScenarioHeader "GRUPO COM DESCONTO 10% — Ana Silva, Dine-In" `
    "4 pratos · desconto de 10% calculado em JS antes de chegar ao Gerente"

$form4 = @{
    customer_id    = 2
    message        = "somos quatro, queremos jantar: dois esparguetes bolonhesa, um hamburguer gourmet e uma bruschetta"
    payment_method = "Credit Card"
    discount       = 0.10
    discount_type  = "percent"
}

# subtotal: 25.00 + 14.00 + 7.50 = 46.50
# desconto 10%: 4.65 → base tributável: 41.85
# IVA 13%: 5.44 → total: 47.29
$r4 = Invoke-Pipeline -FormData $form4 -ExpectStatus 201 -ExpectTotal 47.29

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 5 — VALIDAÇÃO: SEM message (deve retornar HTTP 400)
#  Controller rejeita sem chamar qualquer agente
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ⏳ Aguardando 3s..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

Write-ScenarioHeader "VALIDAÇÃO — Body sem message (HTTP 400 esperado)" `
    "Controller deve rejeitar antes de chamar qualquer agente"

$formNoMsg = @{
    customer_id = 2
    # message ausente → deve retornar 400
}

$r5 = Invoke-Pipeline -FormData $formNoMsg -ExpectStatus 400

# ══════════════════════════════════════════════════════════════════════════════
#  CENÁRIO 6 — VALIDAÇÃO: SEM customer_id (deve retornar HTTP 400)
# ══════════════════════════════════════════════════════════════════════════════

Write-ScenarioHeader "VALIDAÇÃO — Sem customer_id (HTTP 400 esperado)" `
    "Controller deve rejeitar sem chamar agentes"

$formNoCustomer = @{
    message = "quero jantar, esparguete bolonhesa"
    # customer_id ausente → deve retornar 400
}

$r6 = Invoke-Pipeline -FormData $formNoCustomer -ExpectStatus 400

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
Write-Host "    GET $BASE/orders         — todos os pedidos" -ForegroundColor DarkGray
Write-Host "    GET $BASE/orders/pending  — KDS — pedidos em cozinha" -ForegroundColor DarkGray
Write-Host "    GET $BASE/invoices        — todas as faturas" -ForegroundColor DarkGray
Write-Host "    GET $BASE/payments        — todos os pagamentos" -ForegroundColor DarkGray
Write-Host "    GET $BASE/tables          — estado das mesas (incl. Occupied)" -ForegroundColor DarkGray
Write-Host ""
