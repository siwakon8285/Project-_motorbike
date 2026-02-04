
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';

// Helper for logging
const log = (msg, type = 'info') => {
    const colors = {
        info: '\x1b[36m', // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m', // Red
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}] ${msg}${colors.reset}`);
};

// Helper for timing
const timeRequest = async (name, fn) => {
    const start = performance.now();
    try {
        await fn();
        const end = performance.now();
        log(`${name} completed in ${(end - start).toFixed(2)}ms`, 'success');
        return end - start;
    } catch (e) {
        const end = performance.now();
        log(`${name} failed after ${(end - start).toFixed(2)}ms`, 'error');
        throw e;
    }
};

async function runTests() {
    log('Starting API Tests...', 'info');
    
    const uniqueId = Date.now();
    const testUser = {
        username: `testuser_${uniqueId}`,
        email: `test_${uniqueId}@example.com`,
        password: 'password123',
        role: 'customer'
    };

    try {
        // 1. Register
        await timeRequest('Register User', async () => {
            const res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            });
            
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Register failed: ${res.status} ${text}`);
            }
            
            const data = await res.json();
            assert.ok(data.token, 'Token should be present');
            assert.equal(data.user.email, testUser.email, 'Email should match');
            authToken = data.token;
            userId = data.user.id;
            log('User registered successfully');
        });

        // 2. Login
        await timeRequest('Login User', async () => {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: testUser.password
                })
            });

            if (!res.ok) throw new Error(`Login failed: ${res.status}`);
            const data = await res.json();
            assert.ok(data.token, 'Token should be present');
            authToken = data.token; // Update token just in case
        });

        // 3. Get Dashboard (Customer)
        await timeRequest('Get Customer Dashboard', async () => {
            const res = await fetch(`${BASE_URL}/dashboard`, {
                headers: { 'x-auth-token': authToken }
            });

            if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
            const data = await res.json();
            
            // Contract Testing
            assert.ok(data.stats, 'Stats object should exist');
            assert.ok(typeof data.stats.totalBookings === 'number', 'totalBookings should be a number');
            assert.ok(typeof data.stats.upcomingServices === 'number', 'upcomingServices should be a number');
            assert.ok(typeof data.stats.completedServices === 'number', 'completedServices should be a number');
            assert.ok(typeof data.stats.totalSpent === 'number', 'totalSpent should be a number');
            assert.ok(Array.isArray(data.recentHistory), 'recentHistory should be an array');
            
            log(`Dashboard Stats: ${JSON.stringify(data.stats)}`);
        });

        // 4. Performance / Load Simulation (Sequential)
        log('Starting Mini-Load Test (10 requests)...', 'info');
        const loadStart = performance.now();
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(fetch(`${BASE_URL}/dashboard`, {
                headers: { 'x-auth-token': authToken }
            }));
        }
        await Promise.all(requests);
        const loadEnd = performance.now();
        log(`Load test completed in ${(loadEnd - loadStart).toFixed(2)}ms`, 'success');

        // 5. Admin Test (Register Admin)
        const adminUser = {
            username: `admin_${uniqueId}`,
            email: `admin_${uniqueId}@example.com`,
            password: 'password123',
            role: 'admin' // Trying to register as admin
        };
        
        await timeRequest('Register Admin', async () => {
             const res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adminUser)
            });
            if (!res.ok) throw new Error(`Admin register failed: ${res.status}`);
            const data = await res.json();
            const adminToken = data.token;
            
            // Fetch Admin Dashboard
            const dashRes = await fetch(`${BASE_URL}/dashboard`, {
                headers: { 'x-auth-token': adminToken }
            });
             if (!dashRes.ok) throw new Error(`Admin Dashboard fetch failed: ${dashRes.status}`);
             const dashData = await dashRes.json();
             
             // Contract Testing for Admin
             assert.ok(dashData.stats.monthlyRevenue !== undefined, 'monthlyRevenue should exist');
             assert.ok(dashData.stats.lowStockItems !== undefined, 'lowStockItems should exist');
             log('Admin Dashboard verified');
        });

    } catch (err) {
        log(err.message, 'error');
        if (err.cause) console.error(err.cause);
        process.exit(1);
    }
}

runTests();
