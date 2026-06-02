#!/usr/bin/env node
import { runOrderPipeline } from '../src/genAI/orchestrations/orderOrchestrator.js';

async function runExample(example, name) {
  console.log('\n--- Running example:', name, '---');
  try {
    const result = await runOrderPipeline(example);
    console.log('\n[RESULT - ' + name + '] Success:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n[RESULT - ' + name + '] Error:');
    console.error('message:', err && err.message ? err.message : String(err));
    if (err && err.pipeline) console.error('pipeline:', JSON.stringify(err.pipeline, null, 2));
    console.error(err);
  }
}

async function main() {
  const examples = [
    {
      customer_name: 'Teste Sucesso',
      customer_surname: 'Cliente',
      phone: '912345678',
      message: 'Somos duas pessoas para jantar. Queremos um bife mal passado e uma salada, por favor.',
      payment_method: 'Cash',
      tax_rate: 0.13,
    },
    {
      customer_name: 'Teste Falha',
      customer_surname: null,
      phone: '987654321',
      message: 'Quero um prato inexistente chamado xyz123abc e uma bebida',
      payment_method: 'MB Way',
    },
  ];

  for (const [i, ex] of examples.entries()) {
    await runExample(ex, `example-${i + 1}`);
  }

  console.log('\nAll examples executed.');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
