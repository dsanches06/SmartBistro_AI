import http from 'http';

const body = JSON.stringify({ message: 'Mostra o menu de hoje, por favor.', customer_id: 1 });
const opts = {
  hostname: 'localhost',
  port: 3000,
  path: '/chat/message',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    Accept: 'text/event-stream',
  },
};

const req = http.request(opts, (res) => {
  console.log('status', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => process.stdout.write(chunk));
  res.on('end', () => console.log('\n--- stream ended ---'));
});

req.on('error', (err) => console.error('ERR', err));
req.write(body);
req.end();
