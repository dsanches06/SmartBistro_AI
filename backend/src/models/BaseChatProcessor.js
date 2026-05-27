/**
 * Processador Base de Chat — Loop agêntico com chamadas de funções em paralelo
 */

import {
  createGeminiChat,
  FunctionCallingConfigMode,
  genAI,
  MODEL_NAME,
} from "../config/gemini.js";

// Prompt de orquestração do SmartBistro AI — função para garantir data/hora actuais em cada request
const ORCHESTRATION_SYSTEM_PROMPT = () => `
És o ORQUESTRADOR do pipeline de agentes do SmartBistro AI.
A tua única responsabilidade é coordenar, em sequência, os três agentes especializados que processam cada pedido do restaurante.

## PIPELINE OBRIGATÓRIO
Quando recebes um pedido (order), DEVES executar os agentes pela seguinte ordem:

  [1] call_maitre   →   [2] call_chefe   →   [3] call_gerente

Nunca saltes uma etapa. Nunca reordenes. Nunca respondas ao utilizador sem ter completado as três etapas com sucesso.

---

## AGENTE 1 — O MAÎTRE
**Função:** Validação e enriquecimento dos dados do pedido.
**Chama:** call_maitre(order_data)
**Faz:**
- Valida todos os campos obrigatórios do formulário (items, mesa/cliente, restrições alimentares)
- Verifica se o cliente existe na BD; se não existir, regista-o
- Verifica se a mesa existe e está Available; se estiver Occupied ou Reserved, rejeita
- Garante que todos os itens do pedido existem no menu e estão activos (is_active = true)
- Devolve o pedido enriquecido com os IDs correctos da BD (customer_id, table_id, item IDs)

**Se falhar:** interrompe o pipeline e devolve erro de validação. Não avança para o Agente 2.

---

## AGENTE 2 — O CHEFE
**Função:** Sequenciação de cozinha e validação de stock.
**Chama:** call_chefe(validated_order)
**Faz:**
- Recebe o pedido validado pelo Maître
- Consulta as receitas (recipe_items) de cada item pedido
- Verifica o stock de cada ingrediente necessário
- Se houver stock insuficiente: marca o item como indisponível e notifica
- Calcula a sequência óptima de preparação (kitchen_sequence_json) com base nas categorias:
    Appetizer → Main Course → Dessert → Beverage
- Desconta os ingredientes utilizados do stock (adjustQuantity com delta negativo)
- Actualiza a mesa para status Occupied
- Devolve o pedido com kitchen_sequence_json preenchido e stock confirmado

**Se falhar:** reverte os ajustes de stock já efectuados e devolve erro. Não avança para o Agente 3.

---

## AGENTE 3 — O GERENTE
**Função:** Criação do pedido na BD, cálculo financeiro e geração de fatura.
**Chama:** call_gerente(sequenced_order)
**Faz:**
- Grava o pedido (orders) com status "Pending in Kitchen"
- Grava os itens do pedido (order_items) com preço unitário e quantidade
- Calcula:
    subtotal  = Σ (price × quantity) por item
    tax       = subtotal × 0.23   (IVA 23%)
    total     = subtotal + tax
    profit_margin = total − custo de ingredientes (do stock)
- Gera a fatura (invoices) com os valores calculados
- Cria um log do pipeline (logs) com agent_name "orchestrator", status "success"
- Envia notificação para a cozinha
- Devolve a resposta JSON final

**Se falhar:** anula o pedido criado, reverte a fatura e regista log com status "error".

---

## RESPOSTA FINAL
Após completar os 3 agentes com sucesso, devolve **exclusivamente** este JSON:

{
  "success": true,
  "order_id": <id>,
  "table_id": <id>,
  "customer_id": <id>,
  "status": "Pending in Kitchen",
  "kitchen_sequence": [...],
  "invoice": {
    "id": <id>,
    "subtotal": <valor>,
    "tax": <valor>,
    "total": <valor>
  },
  "items": [
    { "name": "...", "quantity": N, "unit_price": X }
  ]
}

Em caso de erro em qualquer etapa, devolve:

{
  "success": false,
  "failed_agent": "maitre" | "chefe" | "gerente",
  "error": "<mensagem descritiva>"
}

---

## REGRAS GERAIS
- Nunca inventes dados — usa sempre as ferramentas para ler/escrever na BD
- Executa as function calls dos três agentes em calls separadas e sequenciais
- Não incluas texto explicativo na resposta — apenas o JSON final
- Data e hora actual: ${new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
`;

// Constrói o config Gemini para o chat com suporte a function calling
function buildChatConfig(tools = []) {
  const hasTools = Array.isArray(tools) && tools.length > 0;
  return {
    systemInstruction: ORCHESTRATION_SYSTEM_PROMPT(),
    temperature: 0.3,
    ...(hasTools && {
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    }),
  };
}

const MAX_AGENTIC_STEPS = 5;

export class BaseChatProcessor {
  constructor({ toolConfig = [], functionHandlers = {} }) {
    this.toolConfig = toolConfig;
    this.functionHandlers = functionHandlers;
  }

  // ── Construir histórico Gemini a partir do formato de conversa ────────────────
  buildHistory(conversationHistory = []) {
    return conversationHistory.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));
  }

  // ── Executar uma chamada de função ────────────────────────────────────────────
  async executeFunction(functionCall) {
    const { name } = functionCall;
    const rawArgs = functionCall.args || functionCall.arguments || {};
    const args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
    const handler = this.functionHandlers[name];

    if (!handler) throw new Error(`Função "${name}" não está registada.`);

    const result = await handler(args);
    return { name, args, result, functionCall };
  }

  extractUserIdFromArgs(rawArgs) {
    const args =
      typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs || {};
    return args.user_id ?? args.userId ?? null;
  }

  filterFunctionCalls(functionCalls = []) {
    const hasCreateWithUserId = functionCalls.some((fc) => {
      if (fc.name !== "set_create_task_values") return false;
      return this.extractUserIdFromArgs(fc.args) != null;
    });

    if (!hasCreateWithUserId) return functionCalls;

    return functionCalls.filter((fc) => fc.name !== "set_assign_task_values");
  }

  isGeminiError(error) {
    return !!error?.geminiType;
  }

  // ── Loop agêntico (sem streaming) ────────────────────────────────────────────
  async processChatMessage(userMessage, conversationHistory = []) {
    try {
      const history = this.buildHistory(conversationHistory);
      const chat = createGeminiChat(buildChatConfig(this.toolConfig), history);

      let response = await chat.sendMessage({ message: userMessage });
      const allResults = [];
      let step = 0;

      while (response.functionCalls?.length && step < MAX_AGENTIC_STEPS) {
        step++;
        const callsToExecute = this.filterFunctionCalls(response.functionCalls);
        console.log(
          `[Agentic step ${step}] calling: ${callsToExecute.map((f) => f.name).join(", ")}`,
        );

        // Execute filtered function calls in parallel
        const execResults = await Promise.all(
          callsToExecute.map((fc) => this.executeFunction(fc)),
        );
        allResults.push(...execResults);

        // Return ALL results to the model in one message
        response = await chat.sendMessage({
          message: {
            role: "tool",
            parts: execResults.map(({ name, result }) => ({
              functionResponse: { name, response: result },
            })),
          },
        });
      }

      const finalText = response.text || "";
      return {
        success: true,
        message: finalText || "Como posso ajudar?",
        functionResults: allResults.map(
          ({ name, args, result, functionCall }) => ({
            functionName: name,
            arguments: args,
            result,
            functionCall,
          }),
        ),
      };
    } catch (error) {
      if (this.isGeminiError(error)) {
        console.error(
          `[ChatProcessor] Gemini ${error.geminiType}:`,
          error.message,
        );
        return {
          success: false,
          geminiError: true,
          errorType: error.geminiType,
          message: error.message,
          functionResults: [],
        };
      }
      console.error("[ChatProcessor] Unexpected error:", error);
      return {
        success: false,
        geminiError: false,
        message: "Ocorreu um erro interno. Tente novamente.",
        functionResults: [],
      };
    }
  }

  // ── Helper: faz streaming de um único round, emite chunks via onChunk ─────────
  async _streamRound(chat, message, onChunk) {
    const stream = await chat.sendMessageStream({ message });
    const functionCalls = [];
    let roundText = "";

    for await (const chunk of stream) {
      // Chamadas de função chegam normalmente no último chunk (sem texto associado)
      if (chunk.functionCalls?.length)
        functionCalls.push(...chunk.functionCalls);
      // Texto emitido imediatamente — streaming verdadeiro
      if (chunk.text) {
        roundText += chunk.text;
        onChunk(chunk.text);
      }
    }

    return { functionCalls, roundText };
  }

  // ── Loop agêntico com streaming verdadeiro ────────────────────────────────────
  // Cada chunk de texto é emitido via onChunk à medida que chega do Gemini.
  // Rondas de function calling não produzem texto, por isso onChunk só dispara
  // na ronda final onde o modelo gera a resposta textual.
  async processChatMessageStream(
    userMessage,
    conversationHistory = [],
    onChunk,
  ) {
    const history = this.buildHistory(conversationHistory);
    const chat = createGeminiChat(buildChatConfig(this.toolConfig), history);
    const allResults = [];
    const allChunks = []; // acumula todo o texto para o campo message do retorno

    const emit = (chunk) => {
      allChunks.push(chunk);
      onChunk(chunk);
    };

    // Primeira ronda — pode ser resposta directa ou chamada de função
    let { functionCalls } = await this._streamRound(chat, userMessage, emit);
    let step = 0;

    while (functionCalls.length && step < MAX_AGENTIC_STEPS) {
      step++;
      const callsToExecute = this.filterFunctionCalls(functionCalls);
      console.log(
        `[Agentic stream step ${step}] calling: ${callsToExecute.map((f) => f.name).join(", ")}`,
      );

      // Executar todas as funções em paralelo
      const execResults = await Promise.all(
        callsToExecute.map((fc) => this.executeFunction(fc)),
      );
      allResults.push(...execResults);

      // Devolver resultados ao modelo e fazer streaming da resposta
      ({ functionCalls } = await this._streamRound(
        chat,
        {
          role: "tool",
          parts: execResults.map(({ name, result }) => ({
            functionResponse: { name, response: result },
          })),
        },
        emit,
      ));
    }

    return {
      success: true,
      message: allChunks.join(""),
      functionResults: allResults.map(
        ({ name, args, result, functionCall }) => ({
          functionName: name,
          arguments: args,
          result,
          functionCall,
        }),
      ),
    };
  }

  // ── Análise de CSV via inlineData (sem function calling) ──────────────────────
  async processCsvMessageStream(
    csvBase64,
    userMessage,
    conversationHistory = [],
    onChunk,
  ) {
    const prompt =
      userMessage?.trim() ||
      "Analisa este ficheiro CSV de despesas e apresenta um resumo financeiro detalhado: totais por categoria, maiores despesas, tendências e sugestões de melhoria.";

    const history = this.buildHistory(conversationHistory);

    const contents = [
      ...history.map((h) => ({ role: h.role, parts: h.parts })),
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "text/csv", data: csvBase64 } },
          { text: prompt },
        ],
      },
    ];

    const stream = await genAI.models.generateContentStream({
      model: MODEL_NAME,
      config: {
        systemInstruction: FINANCIAL_CHAT_SYSTEM_PROMPT,
        temperature: 0.3,
      },
      contents,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return { success: true, message: fullText };
  }
}
