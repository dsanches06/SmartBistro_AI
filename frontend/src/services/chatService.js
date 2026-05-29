import BaseService from "../services/BaseService.js";
import { Order } from "../models/Order.js";

// ── Map HTTP status → error type ─────────────────────────────────────────────
function httpStatusToErrorType(status) {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status === 503) return "SERVICE_DOWN";
  return "SERVER_ERROR";
}

class ChatService extends BaseService {
  constructor() {
    super("/chat");
  }

  // ── Stream com tratamento completo de erros ──────────────────────────────
  async sendMessageToBotStream(
    message,
    conversationHistory = [],
    onChunk,
    onDone,
    conversationId = null,
    user_id = 1,
    onLoading = null,
  ) {
    const payload = { message, conversationHistory, conversationId, user_id };

    try {
      const response = await fetch(`${this.BACKEND_URL}/chat/message/stream`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      // ── HTTP error BEFORE the stream starts ──────────────────────────────
      if (!response.ok) {
        let serverMessage;
        let errorType = httpStatusToErrorType(response.status);

        try {
          const body = await response.json();
          // Pick up the error message from the controller's JSON response
          serverMessage =
            body?.error ||
            body?.message ||
            body?.detail ||
            `Erro ${response.status}: ${response.statusText}`;
        } catch {
          serverMessage = `Erro ${response.status}: ${response.statusText}`;
        }

        if (onDone)
          onDone({
            success:     false,
            providerError: false,
            errorType,
            message:     serverMessage,
          });
        return;
      }

      // ── Read SSE stream ───────────────────────────────────────────────────
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", event = null, data = "";

      const flush = () => {
        if (!event) return;

        try {
          const parsed = JSON.parse(data);

          if (event === "message") {
            if (parsed?.text) onChunk(parsed.text);

          } else if (event === "done") {
            if (onDone) onDone(parsed);

          } else if (
            event === "provider_error" ||
            event === "rate_limit" ||
            event === "service_unavailable" ||
            event === "auth_error" ||
            event === "network_error" ||
            event === "invalid_request"
          ) {
            if (onDone)
              onDone({
                ...parsed,
                success:       false,
                providerError: true,
              });

          } else if (event === "error") {
            // Generic server-side error event
            if (onDone)
              onDone({
                success:     false,
                providerError: false,
                errorType:   parsed?.errorType || "SERVER_ERROR",
                message:     parsed?.message || "Erro inesperado do servidor.",
              });

          } else if (event === "loading") {
            if (typeof onLoading === "function") onLoading(parsed);
          } else if (event === "ping") {
            // Keepalive ping — no UI update.
          }
        } catch {
          /* malformed chunk — ignore */
        }

        event = null;
        data  = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if      (line.startsWith("event:")) event  = line.replace("event:", "").trim();
          else if (line.startsWith("data:"))  data  += line.replace("data:",  "").trim();
          else if (line.trim() === "")        flush();
        }
      }

      // Flush any remaining buffer
      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          if      (line.startsWith("event:")) event  = line.replace("event:", "").trim();
          else if (line.startsWith("data:"))  data  += line.replace("data:",  "").trim();
          else if (line.trim() === "")        flush();
        }
        flush();
      }

    } catch (err) {
      // Network / fetch failure (no response at all)
      const isTimeout =
        err?.name === "AbortError" ||
        (err?.message || "").toLowerCase().includes("timeout");

      if (onDone)
        onDone({
          success:     false,
          providerError: false,
          errorType:   isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
          message:
            isTimeout
              ? "O pedido demorou demasiado tempo. Tente novamente. ⏱️"
              : "Não foi possível ligar ao servidor. Verifique a sua ligação à internet. 🌐",
        });
      else
        throw err;
    }
  }

  async sendMessageToConversation(conversationId, message) {
    return this.sendMessage(
      `/chat/conversation/${conversationId}/message`,
      { message },
    );
  }

  async sendMessage(endpoint, payload, onChunk, onDone, conversationId = null) {
    if (onChunk || onDone) {
      const message = payload && typeof payload === "object" ? payload.message ?? payload : payload;
      const history = payload && typeof payload === "object" ? payload.conversationHistory ?? [] : [];
      const convoId = payload && typeof payload === "object" ? payload.conversationId ?? conversationId : conversationId;
      return this.sendMessageToBotStream(message, history, onChunk, onDone, convoId);
    }
    return super.sendMessage(endpoint, payload);
  }

  extractOrderDataFromFunctionResult(functionResult) {
    if (!functionResult?.result) return null;
    return Order.fromObject(functionResult.result)?.toPayload() || null;
  }

  extractOrderData(providerResponse) {
    if (!providerResponse) return null;
    if (typeof providerResponse === "object")
      return Order.fromObject(providerResponse)?.toPayload() || null;
    try {
      const jsonMatch = providerResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch)
        return Order.fromObject(JSON.parse(jsonMatch[0]))?.toPayload() || null;
    } catch { /* ignore */ }
    return null;
  }

  // ── CSV upload ────────────────────────────────────────────────────────────────
  _readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async uploadCsv(file, message, conversationId, conversationHistory, onChunk, onDone) {
    let csvBase64;
    try {
      csvBase64 = await this._readFileAsBase64(file);
    } catch {
      if (onDone) onDone({ success: false, providerError: false, errorType: "VALIDATION_ERROR", message: "Não foi possível ler o ficheiro." });
      return;
    }

    const payload = {
      csvBase64,
      filename: file.name,
      message: message || "",
      conversationHistory: conversationHistory || [],
      conversationId: conversationId || null,
      user_id: 1,
    };

    try {
      const response = await fetch(`${this.BACKEND_URL}/chat/upload-csv/stream`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        let serverMessage;
        const errorType = httpStatusToErrorType(response.status);
        try {
          const body = await response.json();
          serverMessage = body?.error || body?.message || `Erro ${response.status}: ${response.statusText}`;
        } catch {
          serverMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        if (onDone) onDone({ success: false, providerError: false, errorType, message: serverMessage });
        return;
      }

      // Reutiliza o mesmo parser SSE do sendMessageToBotStream
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", event = null, data = "";

      const flush = () => {
        if (!event) return;
        try {
          const parsed = JSON.parse(data);
          if      (event === "message")        { if (parsed?.text) onChunk(parsed.text); }
          else if (event === "done")           { if (onDone) onDone(parsed); }
          else if (event === "provider_error") { if (onDone) onDone({ ...parsed, success: false, providerError: true }); }
          else if (event === "error")          { if (onDone) onDone({ success: false, providerError: false, errorType: parsed?.errorType || "SERVER_ERROR", message: parsed?.message || "Erro inesperado." }); }
        } catch { /* chunk malformado */ }
        event = null;
        data  = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if      (line.startsWith("event:")) event  = line.replace("event:", "").trim();
          else if (line.startsWith("data:"))  data  += line.replace("data:",  "").trim();
          else if (line.trim() === "")        flush();
        }
      }
      flush();
    } catch (err) {
      const isTimeout = err?.name === "AbortError" || (err?.message || "").toLowerCase().includes("timeout");
      if (onDone) onDone({
        success: false, providerError: false,
        errorType: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        message:   isTimeout ? "O pedido demorou demasiado. Tente novamente. ⏱️" : "Não foi possível ligar ao servidor. 🌐",
      });
    }
  }

  async getConversations()              { return this.fetchData("/conversations"); }
  async getChatHistory(conversationId)  { return this.fetchData(`/chat/history/conversation/${conversationId}`); }
}

export const chatService = new ChatService();
