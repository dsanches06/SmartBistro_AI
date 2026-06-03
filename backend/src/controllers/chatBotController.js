import { ROLE_USER, ROLE_ASSISTANT, writeSseError } from '../utils/index.js';
import { createConversation, createChatHistory } from '../services/index.js';
import { processChatStream } from '../genai/orchestrations/index.js';

// ── Envia mensagem ao bot com resposta em stream SSE ─────────────────────────
export async function sendMessageToBotStream(req, res) {
  const { message, conversationId, customer_id = 1 } = req.body;

  if (!message?.trim())
    return res.status(400).json({ error: 'message is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const ping = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 20000);

  try {
    let convId = conversationId;
    if (!convId) {
      const conv = await createConversation({ customer_id, title: message.slice(0, 50) });
      convId = conv.id;
    }

    console.log(`\n[Bot] conv=${convId} ← "${message}"`);

    await createChatHistory({ conversation_id: convId, role_id: ROLE_USER, content: message });

    let fullText = '';

    await processChatStream(message, String(convId), {
      onChunk: (text) => {
        fullText += text;
        res.write(`event: message\ndata: ${JSON.stringify({ text })}\n\n`);
      },
      onDone: async (_, functionResults = []) => {
        clearInterval(ping);
        console.log(`[Bot] done — fns:[${functionResults.map(f => f.functionName).join(', ')}]`);
        await createChatHistory({ conversation_id: convId, role_id: ROLE_ASSISTANT, content: fullText });
        res.write(
          `event: done\ndata: ${JSON.stringify({
            success:         true,
            conversationId:  convId,
            message:         fullText,
            functionResults: functionResults.map((fr) => ({
              functionName: fr.functionName,
              result:       fr.result,
            })),
          })}\n\n`,
        );
        res.end();
      },
      // Erros do Groq — já classificados e com mensagem amigável
      onError: (err) => {
        clearInterval(ping);
        writeSseError(res, err);
      },
    });
  } catch (err) {
    // Erros antes ou fora do stream (BD, validação, etc.)
    clearInterval(ping);
    writeSseError(res, err);
  }
}

// ── Adiciona mensagem a uma conversa existente (sem stream) ───────────────────
export async function sendMessageToConversation(req, res) {
  const { conversationId } = req.params;
  const { message } = req.body;

  if (!message?.trim())
    return res.status(400).json({ error: 'message is required' });

  try {
    await createChatHistory({ conversation_id: conversationId, role_id: ROLE_USER, content: message });
    res.json({ success: true, conversationId, message: 'Mensagem adicionada à conversa.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
