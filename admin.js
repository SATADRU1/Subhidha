// Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// State
let customersData = [];
let billsData = [];
let notificationsData = [];
let selectedServices = new Set();

// Logout function
function logout() {
    location.href = 'index.html';
}

// Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// API helper with auth
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = { method, headers };
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (response.status === 401) {
            logout();
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Tab switching
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabId === 'customers') loadCustomers();
    if (tabId === 'all-bills') loadBills();
    if (tabId === 'notifications') loadNotifications();
    if (tabId === 'generate-bill') populateCustomerSelect();
}

// Toggle service selection
function toggleService(serviceType, element) {
    element.classList.toggle('selected');
    if (selectedServices.has(serviceType)) {
        selectedServices.delete(serviceType);
    } else {
        selectedServices.add(serviceType);
    }
}

// Load dashboard data
async function loadDashboard() {
    // Try to load from API first
    const dashboard = await apiCall('/admin/dashboard');
    
    if (dashboard) {
        document.getElementById('total-customers').textContent = dashboard.citizens?.total || 0;
        document.getElementById('total-bills').textContent = dashboard.bills?.total || 0;
        document.getElementById('pending-bills').textContent = dashboard.bills?.pending || 0;
        document.getElementById('total-revenue').textContent = '₹' + (dashboard.payments?.revenue || 0).toLocaleString();
    } else {
        // Fallback to localStorage for demo
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
        const bills = JSON.parse(localStorage.getItem('bills')) || [];
        const paidBills = bills.filter(b => b.status === 'paid');
        const revenue = paidBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        
        document.getElementById('total-customers').textContent = customers.length;
        document.getElementById('total-bills').textContent = bills.length;
        document.getElementById('pending-bills').textContent = bills.filter(b => b.status !== 'paid').length;
        document.getElementById('total-revenue').textContent = '₹' + revenue.toLocaleString();
    }
}

// Load customers
async function loadCustomers() {
    const tableBody = document.getElementById('customers-list');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading">Loading customers...</td></tr>';
    
    // Try API first
    const customers = await apiCall('/admin/citizens');
    
    if (customers && Array.isArray(customers)) {
        customersData = customers;
    } else {
        // Fallback to localStorage
        customersData = JSON.parse(localStorage.getItem('customers')) || [];
    }
    
    renderCustomers(customersData);
}

// Render customers table
function renderCustomers(customers) {
    const tableBody = document.getElementById('customers-list');
    
    if (customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#a0a0a0;">No customers found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = customers.map(customer => `
        <tr>
            <td><span class="customer-id">${customer.id || customer.customer_id || 'N/A'}</span></td>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.mobile || 'N/A'}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.address || customer.city || 'N/A'}</td>
            <td>
                <button class="action-btn" onclick="viewCustomer('${customer.id}')">View</button>
                <button class="action-btn" onclick="selectCustomerForBill('${customer.id}', '${customer.name}')">Bill</button>
            </td>
        </tr>
    `).join('');
}

// Filter customers
function filterCustomers() {
    const search = document.getElementById('customer-search').value.toLowerCase();
    const filtered = customersData.filter(c => 
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.id && c.id.toLowerCase().includes(search)) ||
        (c.mobile && c.mobile.includes(search))
    );
    renderCustomers(filtered);
}

// View customer details
function viewCustomer(customerId) {
    const customer = customersData.find(c => c.id === customerId);
    if (!customer) return;
    
    document.getElementById('customer-details').innerHTML = `
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Customer ID:</strong>
            <p class="customer-id" style="margin-top:5px;">${customer.id}</p>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Name:</strong>
            <p>${customer.name || 'N/A'}</p>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Mobile:</strong>
            <p>${customer.mobile || 'N/A'}</p>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Email:</strong>
            <p>${customer.email || 'N/A'}</p>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Address:</strong>
            <p>${customer.address || 'N/A'}, ${customer.city || ''} ${customer.state || ''} ${customer.pincode || ''}</p>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#4ecdc4;">Registered:</strong>
            <p>${customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
    `;
    document.getElementById('customer-modal').classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Select customer for billing
function selectCustomerForBill(customerId, customerName) {
    showTab('generate-bill');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
    
    setTimeout(() => {
        const select = document.getElementById('customer-select');
        select.value = customerId;
    }, 100);
}

// Populate customer select dropdown
function populateCustomerSelect() {
    const select = document.getElementById('customer-select');
    select.innerHTML = '<option value="">Select a customer...</option>';
    
    customersData.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name || 'Unknown'} (${customer.id?.substring(0, 8)}...)`;
        select.appendChild(option);
    });
}

// Service rates
const serviceRates = {
    electricity: { unitRate: 5, fixedCharges: 50 },
    water: { unitRate: 0.02, fixedCharges: 30 },
    gas: { unitRate: 15, fixedCharges: 40 },
    air_pollution: { baseRate: 200 }
};

// Generate bill
async function generateBill(event) {
    event.preventDefault();
    
    const customerId = document.getElementById('customer-select').value;
    const billingPeriod = document.getElementById('billing-period').value;
    const dueDate = document.getElementById('due-date').value;
    
    if (!customerId) {
        alert('Please select a customer');
        return;
    }
    
    if (selectedServices.size === 0) {
        alert('Please select at least one service');
        return;
    }
    
    const generatedBills = [];
    
    for (const service of selectedServices) {
        const unitsInput = document.getElementById(`${service}-units`);
        const units = parseFloat(unitsInput?.value) || 0;
        
        let amount = 0;
        let unitsConsumed = units;
        
        if (service === 'electricity') {
            amount = (serviceRates.electricity.unitRate * units) + serviceRates.electricity.fixedCharges;
        } else if (service === 'water') {
            amount = (serviceRates.water.unitRate * units) + serviceRates.water.fixedCharges;
        } else if (service === 'gas') {
            amount = (serviceRates.gas.unitRate * units) + serviceRates.gas.fixedCharges;
        } else if (service === 'air_pollution') {
            amount = units || serviceRates.air_pollution.baseRate;
            unitsConsumed = null;
        }
        
        const billData = {
            citizen_id: customerId,
            service_type: service,
            amount: Math.round(amount * 100) / 100,
            due_date: dueDate,
            billing_period: billingPeriod,
            units_consumed: unitsConsumed
        };
        
        // Try API first
        const result = await apiCall('/admin/bills', 'POST', billData);
        
        if (result && result.success) {
            generatedBills.push(result);
        } else {
            // Fallback to localStorage
            const bills = JSON.parse(localStorage.getItem('bills')) || [];
            const newBill = {
                id: 'BILL' + Date.now() + Math.random().toString(36).substr(2, 9),
                bill_number: 'BILL' + Math.floor(Math.random() * 9000000 + 1000000),
                citizen_id: customerId,
                service_type: service,
                amount: amount,
                due_date: dueDate,
                billing_period: billingPeriod,
                units_consumed: unitsConsumed,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            bills.push(newBill);
            localStorage.setItem('bills', JSON.stringify(bills));
            generatedBills.push(newBill);
        }
    }
    
    if (generatedBills.length > 0) {
        alert(`Successfully generated ${generatedBills.length} bill(s)!`);
        
        // Reset form
        document.getElementById('billForm').reset();
        selectedServices.clear();
        document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
        
        // Refresh dashboard
        loadDashboard();
    }
}

// Load all bills
async function loadBills() {
    const tableBody = document.getElementById('bills-list');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading">Loading bills...</td></tr>';
    
    // Try API first
    const bills = await apiCall('/admin/bills');
    
    if (bills && Array.isArray(bills)) {
        billsData = bills;
    } else {
        // Fallback to localStorage
        billsData = JSON.parse(localStorage.getItem('bills')) || [];
    }
    
    renderBills(billsData);
}

// Render bills table
function renderBills(bills) {
    const tableBody = document.getElementById('bills-list');
    
    if (bills.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#a0a0a0;">No bills found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = bills.map(bill => {
        const customer = customersData.find(c => c.id === bill.citizen_id);
        const serviceLabels = {
            electricity: '⚡ Electricity',
            water: '💧 Water',
            gas: '🔥 Gas',
            air_pollution: '🌬️ Air Pollution'
        };
        
        return `
            <tr>
                <td>${bill.bill_number || bill.id?.substring(0, 10)}</td>
                <td>${bill.citizen_name || customer?.name || bill.citizen_id?.substring(0, 8)}</td>
                <td>${serviceLabels[bill.service_type] || bill.service_type}</td>
                <td>₹${parseFloat(bill.amount).toLocaleString()}</td>
                <td>${bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</td>
                <td><span class="status-badge status-${bill.status}">${bill.status === 'paid' ? '✓ Paid' : 'Pending'}</span></td>
            </tr>
        `;
    }).join('');
}

// Filter bills
function filterBills() {
    const search = document.getElementById('bill-search').value.toLowerCase();
    const filtered = billsData.filter(b => 
        (b.bill_number && b.bill_number.toLowerCase().includes(search)) ||
        (b.citizen_name && b.citizen_name.toLowerCase().includes(search)) ||
        (b.service_type && b.service_type.toLowerCase().includes(search))
    );
    renderBills(filtered);
}

// Load notifications
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = '<p class="loading">Loading notifications...</p>';
    
    // Try API first
    const payments = await apiCall('/admin/payments');
    
    let notifications = [];
    
    if (payments && Array.isArray(payments)) {
        notifications = payments.map(p => ({
            id: p.id,
            type: 'payment',
            message: `Payment of ₹${p.amount} received for ${p.service_type || 'bill'}`,
            transaction_id: p.transaction_id,
            created_at: p.created_at,
            is_read: p.is_read || false
        }));
    } else {
        // Fallback to localStorage
        const bills = JSON.parse(localStorage.getItem('bills')) || [];
        notifications = bills
            .filter(b => b.status === 'paid')
            .map(b => ({
                id: b.id,
                type: 'payment',
                message: `Payment of ₹${b.amount} received for ${b.service_type}`,
                created_at: b.paid_at || b.created_at,
                is_read: b.notified || false
            }));
    }
    
    // Update notification badge
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notif-badge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
    
    renderNotifications(notifications);
}

// Render notifications
function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#a0a0a0;padding:40px;">No payment notifications</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'}">
            <strong style="color:#4ecdc4;">✓ Payment Received</strong>
            <p>${notif.message}</p>
            ${notif.transaction_id ? `<p style="color:#a0a0a0;font-size:0.9em;">Transaction: ${notif.transaction_id}</p>` : ''}
            <p style="color:#a0a0a0;font-size:0.85em;">${notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</p>
        </div>
    `).join('');
}

// Check for new payment notifications (polling)
function startNotificationPolling() {
    // Check every 30 seconds
    setInterval(async () => {
        const bills = JSON.parse(localStorage.getItem('bills')) || [];
        const newPayments = bills.filter(b => b.status === 'paid' && !b.notified);
        
        if (newPayments.length > 0) {
            // Mark as notified
            newPayments.forEach(b => b.notified = true);
            localStorage.setItem('bills', JSON.stringify(bills));
            
            // Update badge
            const badge = document.getElementById('notif-badge');
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + newPayments.length;
            badge.style.display = 'inline';
        }
    }, 5000);
}

// Initialize demo data if needed
function initializeDemoData() {
    if (!localStorage.getItem('customers')) {
        const demoCustomers = [
            { id: 'CUST001ABC123', name: 'Rahul Sharma', mobile: '9876543210', email: 'rahul@email.com', address: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', created_at: new Date().toISOString() },
            { id: 'CUST002DEF456', name: 'Priya Patel', mobile: '9876543211', email: 'priya@email.com', address: '456 Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700001', created_at: new Date().toISOString() },
            { id: 'CUST003GHI789', name: 'Amit Kumar', mobile: '9876543212', email: 'amit@email.com', address: '789 Brigade Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001', created_at: new Date().toISOString() },
        ];
        localStorage.setItem('customers', JSON.stringify(demoCustomers));
    }
}

// Bill generation form submission
document.getElementById('billForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const customerId = document.getElementById('customerId').value;
    const section = document.getElementById('section').value;
    const units = document.getElementById('units').value;
    const amount = document.getElementById('amount').value;

    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    bills.push({ customerId, section, units, amount, paid: false });
    localStorage.setItem('bills', JSON.stringify(bills));

    alert('Bill generated successfully!');
    document.getElementById('billForm').reset();
    updateBillStatus();
});

// Update bill status display
function updateBillStatus() {
    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    const billStatus = document.getElementById('billStatus');
    billStatus.innerHTML = '';

    bills.forEach(bill => {
        const listItem = document.createElement('li');
        listItem.textContent = `Customer ID: ${bill.customerId}, Section: ${bill.section}, Amount: $${bill.amount}, Paid: ${bill.paid ? '✅' : '❌'}`;
        billStatus.appendChild(listItem);
    });
}

// Initialize on page load
window.onload = function() {
    initializeDemoData();
    loadDashboard();
    loadCustomers();
    startNotificationPolling();
    updateBillStatus();
};
