import { groq } from '../genai/config/index.js';
import fs   from 'fs';
import path from 'path';
import os   from 'os';

// POST /voice/transcribe
// Recebe áudio via multer (campo "file"), escreve num ficheiro temp e usa
// fs.createReadStream() — método recomendado pelo Groq SDK para evitar "invalid file".
export async function transcribe(req, res) {
  let tmpPath = null;
  try {
    if (!req.file) {
      console.error('[Voice Controller] Ficheiro em falta');
      return res.status(400).json({ message: 'Ficheiro de áudio obrigatório.' });
    }

    const { buffer, mimetype, originalname } = req.file;

    if (!buffer?.length) {
      console.error('[Voice Controller] Buffer vazio');
      return res.status(400).json({ message: 'Áudio vazio.' });
    }

    // Remove info de codec (ex: "audio/webm;codecs=opus" → "audio/webm")
    const baseType = (mimetype || 'audio/webm').split(';')[0].trim();
    const ext      = originalname?.split('.').pop() || 'webm';

    console.log(`[Voice] ficheiro=${originalname} mime=${mimetype} base=${baseType} ext=${ext} size=${buffer.length}bytes`);

    // Escreve num ficheiro temp com extensão correcta
    tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, buffer);
    
    // Valida que foi escrito correctamente
    const stats = fs.statSync(tmpPath);
    console.log(`[Voice] temp ficheiro: ${tmpPath} (${stats.size}bytes)`);
    
    if (stats.size === 0) {
      throw new Error('Ficheiro temp vazio após escrita');
    }

    // ✅ Usar createReadStream com rewind para segurança
    const fileStream = fs.createReadStream(tmpPath);
    
    const transcription = await groq.audio.transcriptions.create({
      file:            fileStream,
      model:           'whisper-large-v3',
      language:        'pt',
      response_format: 'json',
    });

    const text = transcription.text?.trim() ?? '';
    console.log(`[Voice] Transcrição sucesso: "${text}"`);
    return res.json({ text });
    
  } catch (err) {
    console.error('[Voice] Erro na transcrição:', err.status || err.code || err.message);
    
    // Erro específico do Groq sobre ficheiro inválido
    if (err.message?.includes('invalid_request_error') || err.status === 400) {
      return res.status(400).json({ 
        message: 'Ficheiro de áudio inválido ou corrompido. Tente gravar novamente.',
        error: err.message 
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao transcrever áudio.',
      error: err.message 
    });
  } finally {
    if (tmpPath) {
      fs.unlink(tmpPath, (err) => {
        if (err) console.warn('[Voice] Erro ao apagar temp:', err.message);
        else console.log(`[Voice] Ficheiro temp removido: ${tmpPath}`);
      });
    }
  }
}
