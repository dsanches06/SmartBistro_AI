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
    if (!req.file) return res.status(400).json({ message: 'Ficheiro de áudio obrigatório.' });

    const { buffer, mimetype, originalname } = req.file;

    if (!buffer?.length) return res.status(400).json({ message: 'Áudio vazio.' });

    // Remove info de codec (ex: "audio/webm;codecs=opus" → "audio/webm")
    const baseType = (mimetype || 'audio/webm').split(';')[0].trim();
    const ext      = originalname?.split('.').pop() || 'webm';

    console.log(`[Voice] ficheiro=${originalname} mime=${mimetype} base=${baseType} ext=${ext} size=${buffer.length}bytes`);

    // Escreve num ficheiro temp com extensão correcta
    tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    const transcription = await groq.audio.transcriptions.create({
      file:            fs.createReadStream(tmpPath),
      model:           'whisper-large-v3',
      language:        'pt',
      response_format: 'json',
    });

    return res.json({ text: transcription.text?.trim() ?? '' });
  } catch (err) {
    console.error('[Voice] Erro na transcrição:', err.message);
    return res.status(500).json({ message: 'Erro ao transcrever áudio.' });
  } finally {
    if (tmpPath) fs.unlink(tmpPath, () => {});
  }
}
