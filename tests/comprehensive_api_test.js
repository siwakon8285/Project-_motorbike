
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';
let customerToken = '';
let adminToken = '';
let customerId = '';
let serviceId = '';
let vehicleId = '';
let partId = '';

// Helper for logging
const log = (msg, type = 'info') => {
    const colors = {
        info: '\x1b[36m', // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m', // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}] ${msg}${colors.reset}`);
};

// Helper for timing and execution
const runTest = async (name, fn) => {
    const start = performance.now();
    try {
        await fn();
        const end = performance.now();
        log(`${name} passed (${(end - start).toFixed(2)}ms)`, 'success');
    } catch (e) {
        const end = performance.now();
        log(`${name} FAILED after ${(end - start).toFixed(2)}ms`, 'error');
        console.error('   Reason:', e.message);
        if (e.cause) console.error('   Cause:', e.cause);
        throw e;
    }
};

// Helper for HTTP requests
const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (options.token) {
        headers['x-auth-token'] = options.token;
    }

    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }

    if (!res.ok) {
        throw new Error(`Request to ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
    }

    return data;
};

async function runComprehensiveTests() {
    log('Starting Comprehensive API Test Suite...', 'info');
    const uniqueId = Date.now();

    try {
        // ==========================================
        // 1. AUTHENTICATION & USERS
        // ==========================================
        
        await runTest('1.1 Register Customer', async () => {
            const user = {
                username: `cust_${uniqueId}`,
                email: `cust_${uniqueId}@example.com`,
                password: 'password123',
                role: 'customer',
                profile: { firstName: 'Test', lastName: 'Customer', phone: '0812345678' }
            };
            const data = await request('/auth/register', { method: 'POST', body: user });
            customerToken = data.token;
            customerId = data.user.id;
            assert.ok(customerToken, 'Token missing');
            assert.equal(data.user.role, 'customer', 'Role mismatch');
        });

        await runTest('1.2 Register Admin', async () => {
            const admin = {
                username: `admin_${uniqueId}`,
                email: `admin_${uniqueId}@example.com`,
                password: 'password123',
                role: 'admin'
            };
            // Note: In real world, admin registration should be protected. 
            // Assuming the endpoint allows it for now based on previous code reading.
            const data = await request('/auth/register', { method: 'POST', body: admin });
            adminToken = data.token;
            assert.ok(adminToken, 'Token missing');
            assert.equal(data.user.role, 'admin', 'Role mismatch');
        });

        await runTest('1.3 Get Current User Profile', async () => {
            const data = await request('/auth/me', { token: customerToken });
            assert.equal(data.id, customerId, 'ID mismatch');
            assert.equal(data.profile.firstName, 'Test', 'First name mismatch');
        });

        // ==========================================
        // 2. VEHICLES
        // ==========================================

        await runTest('2.1 Add Vehicle', async () => {
            const vehicle = {
                brand: 'Honda',
                model: 'Wave 110i',
                year: 2023,
                licensePlate: `1AB-${uniqueId.toString().slice(-4)}`,
                color: 'Red'
            };
            // Route is /api/users/:id/vehicles
            const data = await request(`/users/${customerId}/vehicles`, {
                method: 'POST',
                token: customerToken, // User adding their own vehicle? 
                // Wait, route check: router.post('/:id/vehicles', auth, ... 
                // if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id))
                // So customer CAN add their own vehicle.
                body: vehicle
            });
            vehicleId = data.id;
            assert.ok(vehicleId, 'Vehicle ID missing');
            assert.equal(data.license_plate, vehicle.licensePlate, 'License plate mismatch');
        });

        // ==========================================
        // 3. SERVICES (Admin Only)
        // ==========================================

        await runTest('3.1 Create Service', async () => {
            const service = {
                name: `Oil Change ${uniqueId}`,
                description: 'Full synthetic oil change',
                price: 150.00,
                duration: 30,
                category: 'Maintenance'
            };
            const data = await request('/services', {
                method: 'POST',
                token: adminToken,
                body: service
            });
            serviceId = data.id;
            assert.ok(serviceId, 'Service ID missing');
            assert.equal(data.price, 150.00, 'Price mismatch');
        });

        await runTest('3.2 Get Services List', async () => {
            const data = await request('/services');
            assert.ok(Array.isArray(data), 'Should return array');
            const found = data.find(s => s.id === serviceId);
            assert.ok(found, 'Created service not found in list');
        });

        // ==========================================
        // 4. PARTS (Admin Only)
        // ==========================================

        await runTest('4.1 Create Part', async () => {
            const part = {
                name: `Spark Plug ${uniqueId}`,
                category: 'Engine',
                sku: `SP-${uniqueId}`,
                quantity: 100,
                costPrice: 50,
                sellingPrice: 80,
                supplier: 'NGK'
            };
            const data = await request('/parts', {
                method: 'POST',
                token: adminToken,
                body: part
            });
            partId = data.id;
            assert.ok(partId, 'Part ID missing');
            assert.equal(data.quantity, 100, 'Quantity mismatch');
        });

        // ==========================================
        // 5. BOOKINGS
        // ==========================================

        let bookingId = '';
        await runTest('5.1 Create Booking', async () => {
            const booking = {
                bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                bookingTime: '10:00',
                serviceIds: [serviceId],
                vehicleId: vehicleId,
                notes: 'Please check brakes too'
            };
            const data = await request('/bookings', {
                method: 'POST',
                token: customerToken,
                body: booking
            });
            bookingId = data.id;
            assert.ok(bookingId, 'Booking ID missing');
            assert.equal(data.status, 'pending', 'Default status should be pending');
        });

        await runTest('5.2 Get Customer Bookings', async () => {
            const data = await request('/bookings', { token: customerToken });
            assert.ok(Array.isArray(data), 'Should return array');
            const found = data.find(b => b.id === bookingId);
            assert.ok(found, 'Created booking not found');
        });

        await runTest('5.3 Update Booking Status (Admin)', async () => {
            const data = await request(`/bookings/${bookingId}/status`, {
                method: 'PUT',
                token: adminToken,
                body: { status: 'confirmed' }
            });
            assert.equal(data.status, 'confirmed', 'Status update failed');
        });

        // ==========================================
        // 6. DASHBOARD & ANALYTICS
        // ==========================================

        await runTest('6.1 Customer Dashboard Stats', async () => {
            const data = await request('/dashboard', { token: customerToken });
            // Contract Testing
            assert.ok(data.stats, 'Stats missing');
            assert.ok(typeof data.stats.totalBookings === 'number', 'totalBookings type error');
            assert.ok(data.stats.totalBookings >= 1, 'Should have at least 1 booking');
        });

        await runTest('6.2 Admin Dashboard Stats', async () => {
            const data = await request('/dashboard', { token: adminToken });
            assert.ok(data.stats, 'Stats missing');
            assert.ok(typeof data.stats.monthlyRevenue === 'number', 'monthlyRevenue type error');
            assert.ok(typeof data.stats.pendingBookings === 'number', 'pendingBookings type error');
        });

        // ==========================================
        // 7. NEGATIVE TESTING
        // ==========================================

        await runTest('7.1 Login Invalid Credentials', async () => {
            try {
                await request('/auth/login', {
                    method: 'POST',
                    body: { email: `cust_${uniqueId}@example.com`, password: 'wrongpassword' }
                });
                throw new Error('Should have failed');
            } catch (e) {
                if (!e.message.includes('400')) throw e;
            }
        });

        await runTest('7.2 Create Booking Invalid Date', async () => {
            try {
                await request('/bookings', {
                    method: 'POST',
                    token: customerToken,
                    body: { bookingDate: 'invalid-date', bookingTime: '10:00', serviceIds: [serviceId] }
                });
                throw new Error('Should have failed');
            } catch (e) {
                if (!e.message.includes('400')) throw e;
            }
        });

        log('\nAll Comprehensive Tests Passed! 🚀', 'success');

    } catch (err) {
        log('\nTest Suite Failed ❌', 'error');
        process.exit(1);
    }
}

runComprehensiveTests();
