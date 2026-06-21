import { BACKEND_URL } from './BaseService.js';

// Envia o blob de áudio via FormData ao backend para transcrição com Groq Whisper V3.
export async function transcribeAudio(audioBlob, mimeType = 'audio/webm') {
  // Determina a extensão correcta com base no mimeType do MediaRecorder
  const ext = mimeType.includes('ogg') ? 'ogg'
            : mimeType.includes('mp4') ? 'mp4'
            : mimeType.includes('wav') ? 'wav'
            : 'webm';

  const audioFile = new File([audioBlob], `gravacao.${ext}`, { type: mimeType });
  const formData  = new FormData();
  formData.append('file', audioFile);

  const res = await fetch(`${BACKEND_URL}/voice/transcribe`, {
    method: 'POST',
    body:   formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro na transcrição.');
  return data.text;
}
