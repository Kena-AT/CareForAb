import dotenv from 'dotenv';
dotenv.config();

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

async function testSignup() {
    const response = await fetch(`${backendUrl}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test_user_anon_key12345@gmail.com',
            fullName: 'Test User Anon Key',
            dateOfBirth: '2000-01-01',
            password: 'Password123!',
            purpose: 'signup'
        })
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify({ status: response.status, result }, null, 2));
}

testSignup();

