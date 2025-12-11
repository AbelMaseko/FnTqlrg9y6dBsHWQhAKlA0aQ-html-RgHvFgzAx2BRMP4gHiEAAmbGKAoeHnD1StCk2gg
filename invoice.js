// ========================================
// BULK INVOICE GENERATION FUNCTIONS
// ========================================

let bulkInvoiceData = {
    customers: [],
    targetMonth: ''
};

function openBulkInvoiceGenerator() {
    // Get current date for default month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const defaultMonth = formatDateForInput(nextMonth).substring(0, 7); // YYYY-MM format
    
    bulkInvoiceData.targetMonth = defaultMonth;
    
    // Group invoices by customer (unique customers only)
    const customerMap = new Map();
    
    invoices.forEach(inv => {
        const customerKey = inv.toName.toLowerCase().trim();
        if (!customerMap.has(customerKey)) {
            // Get the most recent invoice for this customer
            customerMap.set(customerKey, {
                customerName: inv.toName,
                address: inv.toAddress,
                phone: inv.toPhone,
                mostRecentInvoice: inv,
                totalInvoices: 1,
                newTotal: inv.total,
                selected: false
            });
        } else {
            // Update if this invoice is more recent
            const existing = customerMap.get(customerKey);
            existing.totalInvoices++;
            if (new Date(inv.date) > new Date(existing.mostRecentInvoice.date)) {
                existing.mostRecentInvoice = inv;
                existing.newTotal = inv.total;
            }
        }
    });
    
    // Convert map to array and sort by customer name
    bulkInvoiceData.customers = Array.from(customerMap.values()).sort((a, b) => 
        a.customerName.localeCompare(b.customerName)
    );

    // Create and show modal
    const modal = document.createElement('div');
    modal.id = 'bulk-invoice-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;justify-content:center;align-items:center;padding:20px;overflow-y:auto;';
    
    modal.innerHTML = `
        <div class="modal-content" style="background:#1a1a2e;border-radius:20px;padding:30px;max-width:1000px;width:95%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h2 style="color:#667eea;margin:0;">📅 Bulk Invoice Generator by Customer</h2>
                <button onclick="closeBulkInvoiceGenerator()" style="background:rgba(220,53,69,0.8);color:white;border:none;width:35px;height:35px;border-radius:50%;font-size:1.5rem;cursor:pointer;transition:all 0.3s;">&times;</button>
            </div>
            
            <div style="margin-bottom:20px;padding:15px;background:rgba(102,126,234,0.1);border-radius:10px;">
                <p style="color:#a0a0a0;margin:0 0 15px;">Select customers to generate new invoices for. New invoices will be created without affecting existing ones.</p>
                
                <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;">
                        <label style="color:#667eea;font-weight:bold;display:block;margin-bottom:5px;">Target Month:</label>
                        <input type="month" id="target-month-input" value="${defaultMonth}" 
                            onchange="updateTargetMonth(this.value)"
                            style="padding:10px;border-radius:8px;border:1px solid #333;background:#2a2a3e;color:#fff;width:100%;font-size:1rem;">
                    </div>
                    
                    <div style="flex:1;min-width:200px;">
                        <label style="color:#667eea;font-weight:bold;display:block;margin-bottom:5px;">Invoice Date:</label>
                        <input type="date" id="invoice-date-input" value="${formatDateForInput(nextMonth)}"
                            style="padding:10px;border-radius:8px;border:1px solid #333;background:#2a2a3e;color:#fff;width:100%;font-size:1rem;">
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-small" onclick="selectAllBulkCustomers()">✓ Select All</button>
                <button class="btn btn-secondary btn-small" onclick="deselectAllBulkCustomers()">✗ Deselect All</button>
                <button class="btn btn-success" onclick="generateBulkInvoices()" style="margin-left:auto;">📄 Generate Invoices</button>
            </div>
            
            <div style="margin-bottom:10px;padding:10px;background:rgba(102,126,234,0.15);border-radius:8px;">
                <p style="color:#667eea;margin:0;font-size:0.9rem;">📊 Showing ${bulkInvoiceData.customers.length} unique customers</p>
            </div>
            
            <div id="bulk-customers-list" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;padding:10px;background:rgba(0,0,0,0.2);border-radius:10px;">
                ${renderBulkCustomersList()}
            </div>
            
            <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <span style="color:#a0a0a0;">Selected: <span id="bulk-selected-count">0</span> customers</span>
                    <span style="color:#667eea;font-size:1.2rem;">Total: R<span id="bulk-total-amount">0.00</span></span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    updateBulkTotals();
}

function renderBulkCustomersList() {
    if (bulkInvoiceData.customers.length === 0) {
        return '<p style="color:#666;text-align:center;padding:40px;">No customers found.</p>';
    }
    
    return bulkInvoiceData.customers.map((customer, index) => {
        const lastInv = customer.mostRecentInvoice;
        const status = getInvoicePaymentStatus(lastInv.id);
        const statusColor = status.status === 'paid' ? '#10b981' : status.status === 'partial' ? '#f59e0b' : '#dc2626';
        
        return `
        <div class="bulk-customer-item" style="background:rgba(255,255,255,0.05);border-radius:12px;padding:15px;display:flex;align-items:center;gap:15px;flex-wrap:wrap;${customer.selected ? 'border:2px solid #667eea;' : 'border:2px solid transparent;opacity:0.7;'}transition:all 0.3s;">
            <input type="checkbox" ${customer.selected ? 'checked' : ''} onchange="toggleBulkCustomer(${index})" style="width:20px;height:20px;cursor:pointer;">
            
            <div style="flex:1;min-width:250px;">
                <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px;">
                    <div>
                        <h4 style="margin:0;color:#fff;">${customer.customerName}</h4>
                        <p style="margin:5px 0 0;color:#a0a0a0;font-size:0.9rem;">${customer.address || 'No address'}</p>
                        ${customer.phone ? `<p style="margin:5px 0 0;color:#a0a0a0;font-size:0.85rem;">📱 ${customer.phone}</p>` : ''}
                        <p style="margin:5px 0 0;color:#667eea;font-size:0.85rem;">${customer.totalInvoices} invoice(s) in history</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="margin:0;color:#a0a0a0;font-size:0.85rem;">Last Invoice:</p>
                        <p style="margin:5px 0 0;color:${statusColor};font-weight:bold;font-size:0.9rem;">#${lastInv.number}</p>
                        <p style="margin:5px 0 0;color:#a0a0a0;font-size:0.85rem;">${formatDate(lastInv.date)}</p>
                        <p style="margin:5px 0 0;color:${statusColor};font-size:0.85rem;font-weight:bold;">${status.status.toUpperCase()}</p>
                    </div>
                </div>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:5px;min-width:150px;">
                <label style="color:#a0a0a0;font-size:0.8rem;">Invoice Amount:</label>
                <input type="number" value="${customer.newTotal.toFixed(2)}" 
                    onchange="updateBulkCustomerAmount(${index}, this.value)"
                    style="padding:8px 12px;border-radius:8px;border:1px solid #333;background:#2a2a3e;color:#fff;width:100%;"
                    min="0" step="0.01">
                <p style="margin:5px 0 0;color:#667eea;font-size:0.75rem;">Last: R${lastInv.total.toFixed(2)}</p>
            </div>
            
            <button onclick="removeBulkCustomer(${index})" style="background:#dc2626;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">🗑️</button>
        </div>
    `;
    }).join('');
}

function toggleBulkCustomer(index) {
    bulkInvoiceData.customers[index].selected = !bulkInvoiceData.customers[index].selected;
    refreshBulkCustomerList();
}

function updateBulkCustomerAmount(index, value) {
    const amount = parseFloat(value) || 0;
    bulkInvoiceData.customers[index].newTotal = Math.max(0, amount);
    updateBulkTotals();
}

function removeBulkCustomer(index) {
    bulkInvoiceData.customers.splice(index, 1);
    refreshBulkCustomerList();
}

function selectAllBulkCustomers() {
    bulkInvoiceData.customers.forEach(c => c.selected = true);
    refreshBulkCustomerList();
}

function deselectAllBulkCustomers() {
    bulkInvoiceData.customers.forEach(c => c.selected = false);
    refreshBulkCustomerList();
}

function updateTargetMonth(month) {
    bulkInvoiceData.targetMonth = month;
    const dateInput = document.getElementById('invoice-date-input');
    if (dateInput) {
        dateInput.value = month + '-01';
    }
}

function refreshBulkCustomerList() {
    const listContainer = document.getElementById('bulk-customers-list');
    if (listContainer) {
        listContainer.innerHTML = renderBulkCustomersList();
        updateBulkTotals();
    }
}

function updateBulkTotals() {
    const selected = bulkInvoiceData.customers.filter(c => c.selected);
    const countEl = document.getElementById('bulk-selected-count');
    const amountEl = document.getElementById('bulk-total-amount');
    
    if (countEl) countEl.textContent = selected.length;
    if (amountEl) amountEl.textContent = selected.reduce((s, c) => s + c.newTotal, 0).toFixed(2);
}

function closeBulkInvoiceGenerator() {
    const modal = document.getElementById('bulk-invoice-modal');
    if (modal) modal.remove();
    bulkInvoiceData = { customers: [], targetMonth: '' };
}

async function generateBulkInvoices() {
    const selectedCustomers = bulkInvoiceData.customers.filter(c => c.selected);
    
    if (selectedCustomers.length === 0) {
        showToast('No customers selected', 'warning');
        return;
    }
    
    const invoiceDateInput = document.getElementById('invoice-date-input');
    const invoiceDate = invoiceDateInput ? invoiceDateInput.value : formatDateForInput(new Date());
    
    if (!invoiceDate) {
        showToast('Please select an invoice date', 'warning');
        return;
    }
    
    let generatedCount = 0;
    
    for (const customer of selectedCustomers) {
        const lastInv = customer.mostRecentInvoice;
        const abbr = getCompanyAbbreviation();
        const timestamp = Date.now() + generatedCount * 100; // Ensure unique IDs
        const invoiceNumber = abbr + '-INV-' + timestamp;
        
        // Calculate new item amounts proportionally if total changed
        const ratio = customer.newTotal / lastInv.total;
        const newItems = lastInv.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate * ratio,
            amount: item.amount * ratio
        }));
        
        // Create NEW invoice (does NOT affect old invoices)
        const newInvoice = {
            id: timestamp,
            number: invoiceNumber,
            date: invoiceDate,
            dueDate: getEndOfMonth(invoiceDate),
            fromName: lastInv.fromName || companySettings.name || '',
            fromAddress: lastInv.fromAddress || companySettings.address || '',
            toName: customer.customerName,
            toAddress: customer.address,
            toPhone: customer.phone,
            items: newItems,
            total: customer.newTotal,
            notes: lastInv.notes || `Generated for ${bulkInvoiceData.targetMonth}`,
            bankAccounts: lastInv.bankAccounts || bankAccounts
        };
        
        // Add to invoices array (old invoices remain unchanged)
        invoices.push(newInvoice);
        generatedCount++;
        
        // Small delay to ensure unique IDs
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save all invoices (old + new)
    await saveToIndexedDB('invoices', invoices);
    showToast(`✅ ${generatedCount} new invoice(s) generated successfully!`, 'success');
    
    setTimeout(() => {
        closeBulkInvoiceGenerator();
        switchTab('invoices');
        updateDashboard();
    }, 1500);
}
