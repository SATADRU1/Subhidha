// Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// State
let allBills = [];
let currentSection = 'all';
let currentBillToPay = null;
let selectedUpiApp = null;
let customerId = null;

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

// Section labels and icons
const sectionConfig = {
    all: { icon: '📋', label: 'All Bills' },
    electricity: { icon: '⚡', label: 'Electricity Bills' },
    water: { icon: '💧', label: 'Water Bills' },
    gas: { icon: '🔥', label: 'Gas Bills' },
    air_pollution: { icon: '🌬️', label: 'Air Pollution Tax' }
};

// Show section
function showSection(section) {
    currentSection = section;
    
    // Update active tab
    document.querySelectorAll('.section-tab').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Update section title
    document.getElementById('section-icon').textContent = sectionConfig[section].icon;
    document.getElementById('section-label').textContent = sectionConfig[section].label;
    
    // Filter and render bills
    renderBills();
}

// Load customer profile
async function loadCustomerProfile() {
    // Try API first
    const profile = await apiCall('/citizen/profile');
    
    if (profile && profile.id) {
        customerId = profile.id;
        localStorage.setItem('customerId', customerId);
    } else {
        // Fallback to localStorage
        customerId = localStorage.getItem('customerId');
        if (!customerId) {
            // Generate a demo customer ID
            const customers = JSON.parse(localStorage.getItem('customers')) || [];
            if (customers.length > 0) {
                customerId = customers[0].id;
            } else {
                customerId = 'CUST' + Date.now().toString(36).toUpperCase();
            }
            localStorage.setItem('customerId', customerId);
        }
    }
    
    // Display customer ID
    const shortId = customerId.length > 12 ? customerId.substring(0, 12) + '...' : customerId;
    document.getElementById('customer-id-display').textContent = shortId;
    document.getElementById('customer-id-display').title = customerId;
}

// Load bills
function loadBills() {
    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    const sections = {
        water: document.getElementById('waterBills'),
        gas: document.getElementById('gasBills'),
        electricity: document.getElementById('electricityBills'),
        airPollution: document.getElementById('airPollutionBills'),
    };

    Object.values(sections).forEach(section => (section.innerHTML = ''));

    bills.forEach((bill, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `Customer ID: ${bill.customerId}, Units: ${bill.units}, Amount: $${bill.amount}`;
        if (bill.paid) {
            listItem.textContent += ' ✅';
        } else {
            const payButton = document.createElement('button');
            payButton.textContent = 'Pay';
            payButton.onclick = function () {
                simulateUPIPayment(index);
            };
            listItem.appendChild(payButton);
        }
        sections[bill.section].appendChild(listItem);
    });
}

function simulateUPIPayment(index) {
    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    const bill = bills[index];

    if (confirm(`Pay $${bill.amount} for ${bill.section}?`)) {
        bill.paid = true;
        localStorage.setItem('bills', JSON.stringify(bills));
        loadBills();
        alert('Payment successful!');
    }
}

// Update pending bill counts
function updatePendingCounts() {
    const sections = ['all', 'electricity', 'water', 'gas', 'air_pollution'];
    
    sections.forEach(section => {
        let pendingBills;
        if (section === 'all') {
            pendingBills = allBills.filter(b => b.status !== 'paid');
        } else {
            pendingBills = allBills.filter(b => b.service_type === section && b.status !== 'paid');
        }
        
        const badge = document.getElementById(`${section}-count`);
        if (pendingBills.length > 0) {
            badge.textContent = pendingBills.length;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    });
}

// Render bills
function renderBills() {
    const container = document.getElementById('bills-list');
    
    let filteredBills = currentSection === 'all' 
        ? allBills 
        : allBills.filter(b => b.service_type === currentSection);
    
    // Sort: pending first, then by due date
    filteredBills.sort((a, b) => {
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        return new Date(a.due_date) - new Date(b.due_date);
    });
    
    if (filteredBills.length === 0) {
        container.innerHTML = `
            <div class="no-bills">
                <div class="icon">${sectionConfig[currentSection].icon}</div>
                <p>No bills found for ${sectionConfig[currentSection].label}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredBills.map(bill => {
        const isPaid = bill.status === 'paid';
        const dueDate = bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A';
        const serviceLabel = sectionConfig[bill.service_type]?.label || bill.service_type;
        const serviceIcon = sectionConfig[bill.service_type]?.icon || '📋';
        
        return `
            <div class="bill-card ${isPaid ? 'paid' : ''}" onclick="${isPaid ? '' : `openPaymentModal('${bill.id}')`}" style="cursor: ${isPaid ? 'default' : 'pointer'}">
                <div class="bill-info">
                    <h3>${serviceIcon} ${serviceLabel}</h3>
                    <p>Bill No: ${bill.bill_number || bill.id?.substring(0, 10)}</p>
                    <p>Billing Period: ${bill.billing_period || 'N/A'}</p>
                    <p>Due Date: ${dueDate}</p>
                    ${bill.units_consumed ? `<p>Units: ${bill.units_consumed}</p>` : ''}
                </div>
                <div class="bill-status">
                    <div>
                        <div class="bill-amount">₹${parseFloat(bill.amount).toLocaleString()}</div>
                        ${isPaid 
                            ? '<span class="status-badge status-paid">✓ Paid</span>' 
                            : '<span class="status-badge status-pending">Pending</span>'
                        }
                    </div>
                    ${isPaid 
                        ? '<span class="paid-tick">✓</span>' 
                        : '<button class="pay-btn" onclick="event.stopPropagation(); openPaymentModal(\'' + bill.id + '\')">Pay Now</button>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Open payment modal
function openPaymentModal(billId) {
    currentBillToPay = allBills.find(b => b.id === billId);
    if (!currentBillToPay) return;
    
    // Reset modal state
    document.getElementById('payment-form').style.display = 'block';
    document.getElementById('payment-processing').classList.remove('active');
    document.getElementById('payment-success').classList.remove('active');
    document.getElementById('upi-id').value = '';
    document.getElementById('confirm-pay-btn').disabled = true;
    selectedUpiApp = null;
    document.querySelectorAll('.upi-app').forEach(app => app.classList.remove('selected'));
    
    // Set bill details
    const serviceLabel = sectionConfig[currentBillToPay.service_type]?.label || currentBillToPay.service_type;
    document.getElementById('bill-details-modal').textContent = `${serviceLabel} - ${currentBillToPay.billing_period || 'Bill'}`;
    document.getElementById('payment-amount').textContent = parseFloat(currentBillToPay.amount).toLocaleString();
    
    // Show modal
    document.getElementById('payment-modal').classList.add('active');
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
    currentBillToPay = null;
    selectedUpiApp = null;
}

// Select UPI app
function selectUpiApp(app, element) {
    selectedUpiApp = app;
    document.querySelectorAll('.upi-app').forEach(a => a.classList.remove('selected'));
    element.classList.add('selected');
    validatePaymentForm();
}

// Validate payment form
function validatePaymentForm() {
    const upiId = document.getElementById('upi-id').value.trim();
    const isValid = selectedUpiApp && upiId.includes('@');
    document.getElementById('confirm-pay-btn').disabled = !isValid;
}

// Add event listener for UPI ID input
document.addEventListener('DOMContentLoaded', () => {
    const upiInput = document.getElementById('upi-id');
    if (upiInput) {
        upiInput.addEventListener('input', validatePaymentForm);
    }
});

// Process payment
async function processPayment() {
    if (!currentBillToPay || !selectedUpiApp) return;
    
    const upiId = document.getElementById('upi-id').value.trim();
    if (!upiId.includes('@')) {
        alert('Please enter a valid UPI ID');
        return;
    }
    
    // Show processing
    document.getElementById('payment-form').style.display = 'none';
    document.getElementById('payment-processing').classList.add('active');
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try API first
    const paymentData = {
        bill_id: currentBillToPay.id,
        payment_method: `upi_${selectedUpiApp}`
    };
    
    const result = await apiCall('/payments', 'POST', paymentData);
    
    let transactionId;
    
    if (result && result.success) {
        transactionId = result.transaction_id;
    } else {
        // Fallback to localStorage
        transactionId = 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // Update bill status in localStorage
        const bills = JSON.parse(localStorage.getItem('bills')) || [];
        const billIndex = bills.findIndex(b => b.id === currentBillToPay.id);
        if (billIndex !== -1) {
            bills[billIndex].status = 'paid';
            bills[billIndex].paid_at = new Date().toISOString();
            bills[billIndex].transaction_id = transactionId;
            bills[billIndex].payment_method = `upi_${selectedUpiApp}`;
            localStorage.setItem('bills', JSON.stringify(bills));
        }
    }
    
    // Update local state
    const billInState = allBills.find(b => b.id === currentBillToPay.id);
    if (billInState) {
        billInState.status = 'paid';
        billInState.transaction_id = transactionId;
    }
    
    // Show success
    document.getElementById('payment-processing').classList.remove('active');
    document.getElementById('payment-success').classList.add('active');
    document.getElementById('transaction-id').textContent = `Transaction ID: ${transactionId}`;
    
    // Update UI
    updatePendingCounts();
    renderBills();
}

// Initialize on page load
window.onload = async function() {
    await loadCustomerProfile();
    await loadBills();
    
    // Poll for new bills every 30 seconds
    setInterval(loadBills, 30000);
};
