fetch('http://localhost:5000/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'kenaararso4@gmail.com', redirectTo: 'http://localhost:3000/auth?mode=reset-password' })
}).then(res => res.json()).then(console.log).catch(console.error);
