import assert from 'assert';
import {
  attemptRepairMaitreResponse,
  repairManagerResponse,
} from '../src/genAI/orchestrations/orderOrchestrator.js';

const menuItems = [
  { id: 1, name: 'Salada Mista', price: 6 },
  { id: 2, name: 'Bife à Casa', price: 16 },
];

function runTests() {
  console.log('Running orderOrchestrator repair tests...');

  const parsed = {
    customer_name: 'Teste',
    customer_surname: 'Falha',
    table_id: 1,
    service_type: 'Table',
    allergy_restrictions: null,
    validation_status: 'invalid',
    invalid_items: ['Salada Mista', 'Bife à Casa'],
    notes: 'Pedido com nomes de itens em invalid_items.',
  };

  const repaired = attemptRepairMaitreResponse(parsed, menuItems);

  assert(Array.isArray(repaired.items), 'items deve ser um array após reparo');
  assert.strictEqual(repaired.items.length, 2, 'deve gerar dois itens reparados');
  assert.strictEqual(repaired.items[0].item_id, 1, 'primeiro item deve casar com menu item 1');
  assert.strictEqual(repaired.items[1].item_id, 2, 'segundo item deve casar com menu item 2');
  assert.strictEqual(repaired.items[0].price, 6, 'preço do primeiro item deve ser corrigido para preço do menu');
  assert.strictEqual(repaired.items[1].price, 16, 'preço do segundo item deve ser corrigido para preço do menu');
  assert.strictEqual(repaired.validation_status, 'invalid', 'validation_status deve permanecer invalid após reparo');

  const parsedBadIds = {
    ...parsed,
    invalid_items: undefined,
    items: [
      { item_id: '17,', name: 'Bife à Casa', quantity: '1', price: '16' },
      { item_id: '22.', name: 'Salada Mista', quantity: '1', price: '6' },
    ],
  };
  const repairedBadIds = attemptRepairMaitreResponse(parsedBadIds, menuItems);
  assert.strictEqual(repairedBadIds.items[0].item_id, 17, 'Deve extrair item_id válido de string com pontuação');
  assert.strictEqual(repairedBadIds.items[1].item_id, 22, 'Deve extrair item_id válido de string com ponto final');

  const managerRaw = {
    success: "true",
    invoice: { subtotal_amount: "18.08", tax_rate: "0.23", tax_amount: "3.79" },
    payment: {},
  };
  const managerRepaired = repairManagerResponse(managerRaw, {
    subtotal: 18.08,
    taxRate: 0.23,
    taxAmount: 3.79,
    total: 21.87,
  });

  assert.strictEqual(managerRepaired.success, true, 'success deve ser normalizado para boolean');
  assert.strictEqual(
    managerRepaired.order_summary,
    'Pedido confirmado com total €21.87.',
    'order_summary deve receber texto padrão quando estiver ausente',
  );
  assert.strictEqual(
    managerRepaired.payment.method,
    'Pending',
    'payment.method deve ter fallback Pending',
  );
  assert.strictEqual(
    managerRepaired.payment.status,
    'Pending',
    'payment.status deve ter fallback Pending',
  );

  console.log('✅ orderOrchestrator repair tests passed.');
}

runTests();
