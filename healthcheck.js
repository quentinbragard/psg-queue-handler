// healthcheck.js
import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/',
  timeout: 2000
};

const request = http.get(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

request.end();