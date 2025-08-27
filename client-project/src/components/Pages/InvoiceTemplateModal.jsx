import React, { useState, useEffect } from 'react';

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function InvoiceTemplateModal({ isOpen, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    invoice_no: `INV-${String(Date.now()).slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    customer: {
      id: '',
      name: '',
      address: '',
      phone: '',
      email: ''
    },
    items: [{
      desc: '',
      qty: 1,
      rate: 0,
      amount: 0
    }],
    notes: '',
    vatRate: 5, // Default 5% VAT
    totals: {
      subtotal: 0,
      vat: 0,
      total: 0
    }
  });

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  // Company info - you can make this editable later
  const [companyInfo] = useState({
    name: "MUHAMMAD ASIF LOADING & LIFTING EQUIPMENT RENTAL L.L.C",
    address: "P.O.BOX : 379154 , DUBAI ,",
    country: "UNITED ARAB EMIRATES",
    email: "equipmentrental24@gmail.com",
    trn: "100575985500003"
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/customer/get/E-customer`);
      const data = await response.json();
      if (response.ok) {
        // The response might be an array directly or wrapped in an object
        const customerList = Array.isArray(data) ? data : (data.customers || data.rows || []);
        setCustomers(customerList);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: {
          id: customer.id,
          name: customer.name,
          address: customer.location || '',
          phone: customer.contact || '',
          email: customer.email || ''
        }
      }));
    } else if (customerId === 'new') {
      setShowNewCustomerForm(true);
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/customer/add-new-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCustomer.name,
          contact: newCustomer.phone,
          location: newCustomer.address,
          vehicle: 'N/A',
          description: 'Added from invoice',
          amount: 0
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Refresh customers list
        await fetchCustomers();
        
        // Select the new customer
        setFormData(prev => ({
          ...prev,
          customer: {
            id: data.customerId,
            name: newCustomer.name,
            address: newCustomer.address,
            phone: newCustomer.phone || '',
            email: newCustomer.email || ''
          }
        }));

        // Reset form and hide
        setNewCustomer({ name: '', address: '', phone: '', email: '' });
        setShowNewCustomerForm(false);
        alert('Customer created successfully!');
      } else {
        alert(data.Message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    }
  };

  const calculateTotals = (items, vatRate) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const vat = (subtotal * vatRate) / 100;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Calculate amount for this item
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }
    
    // Calculate totals
    const totals = calculateTotals(newItems, formData.vatRate);
    
    setFormData(prev => ({
      ...prev,
      items: newItems,
      totals
    }));
  };

  const handleVatRateChange = (newRate) => {
    const totals = calculateTotals(formData.items, newRate);
    setFormData(prev => ({
      ...prev,
      vatRate: newRate,
      totals
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { desc: '', qty: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      const totals = calculateTotals(newItems, formData.vatRate);
      
      setFormData(prev => ({
        ...prev,
        items: newItems,
        totals
      }));
    }
  };

  const handleSaveInvoice = async () => {
    if (!formData.customer.name) {
      alert('Please select or add a customer');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/invoice/post/E-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          customer_id: formData.customer.id
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Invoice saved successfully!');
        onClose();
      } else {
        alert(data.Message || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a downloadable HTML file
    const invoiceHtml = generateInvoiceHtml();
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${formData.invoice_no}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateInvoiceHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${formData.invoice_no}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .company-name { font-size: 18px; font-weight: bold; }
        .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; text-align: center; }
        .customer-info { margin: 20px 0; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table th, .invoice-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .invoice-table th { background-color: #f0f0f0; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { font-weight: bold; font-size: 18px; }
        .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${companyInfo.name}</div>
        <div>${companyInfo.address}</div>
        <div>${companyInfo.country}</div>
        <div>E-mail: ${companyInfo.email}</div>
        <div>TRN NO: ${companyInfo.trn}</div>
    </div>

    <div class="invoice-title">TAX INVOICE</div>
    
    <div class="invoice-meta">
        <div class="customer-info">
            <strong>TO:</strong><br>
            ${formData.customer.name}<br>
            ${formData.customer.address}
        </div>
        <div>
            <strong>Invoice No:</strong> ${formData.invoice_no}<br>
            <strong>Invoice Date:</strong> ${new Date(formData.date).toLocaleDateString()}
        </div>
    </div>

    <table class="invoice-table">
        <thead>
            <tr>
                <th>s.No</th>
                <th>Description</th>
                <th>No of Units</th>
                <th>UOM</th>
                <th>Unit Price</th>
                <th>Taxable Amount</th>
                <th>Vat %</th>
                <th>Vat Amount</th>
                <th>Total Amount</th>
            </tr>
        </thead>
        <tbody>
            ${formData.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.desc}</td>
                    <td>${item.qty}</td>
                    <td>HR</td>
                    <td>${item.rate}</td>
                    <td>${item.amount.toFixed(2)}</td>
                    <td>${formData.vatRate}</td>
                    <td>${((item.amount * formData.vatRate) / 100).toFixed(2)}</td>
                    <td>${(item.amount + (item.amount * formData.vatRate) / 100).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div><strong>INVOICE TOTAL:</strong> ${formData.totals.subtotal.toFixed(2)}</div>
        <div><strong>Tax Total:</strong> ${formData.totals.vat.toFixed(2)}</div>
        <div><strong>Grand Amount AED:</strong> ${formData.totals.total.toFixed(2)}</div>
        <div style="margin-top: 30px;">
            <div>Received By: _________________</div>
            <div style="margin-top: 40px;">Signature: _________________</div>
        </div>
    </div>

    ${formData.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong> ${formData.notes}</div>` : ''}
</body>
</html>`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Create Invoice</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="btn-secondary text-sm">
              📥 Download
            </button>
            <button onClick={handlePrint} className="btn-primary text-sm">
              🖨️ Print
            </button>
            <button onClick={onClose} className="btn-ghost text-sm">
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Company Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-lg font-bold">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
            <p className="text-sm">{companyInfo.country}</p>
            <p className="text-sm">E-mail: {companyInfo.email}</p>
            <p className="text-sm">TRN NO: {companyInfo.trn}</p>
          </div>

          {/* Invoice Title */}
          <h2 className="text-center text-xl font-bold my-4">TAX INVOICE</h2>

          {/* Invoice Info */}
          <div className="flex justify-between mb-6">
            <div className="w-1/2">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Customer</label>
                <select
                  value={formData.customer.id}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                  <option value="new">+ Add New Customer</option>
                </select>
              </div>
              
              {formData.customer.name && (
                <div className="border p-3 rounded bg-gray-50">
                  <strong>TO:</strong><br />
                  <div>{formData.customer.name}</div>
                  <div>{formData.customer.address}</div>
                  {formData.customer.phone && <div>Phone: {formData.customer.phone}</div>}
                  {formData.customer.email && <div>Email: {formData.customer.email}</div>}
                </div>
              )}
            </div>

            <div className="w-1/3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice No</label>
                  <input
                    type="text"
                    value={formData.invoice_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="mb-6 p-4 border rounded bg-blue-50">
              <h5 className="font-medium mb-3">Add New Customer</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleCreateNewCustomer} className="btn-primary text-sm">
                  Create Customer
                </button>
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Invoice Items Table */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Invoice Items</h4>
              <button onClick={addItem} className="btn-primary text-sm">
                + Add Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">s.No</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">No of Units</th>
                    <th className="border border-gray-300 p-2 text-left">UOM</th>
                    <th className="border border-gray-300 p-2 text-left">Unit Price</th>
                    <th className="border border-gray-300 p-2 text-left">Taxable Amount</th>
                    <th className="border border-gray-300 p-2 text-left">Vat %</th>
                    <th className="border border-gray-300 p-2 text-left">Vat Amount</th>
                    <th className="border border-gray-300 p-2 text-left">Total Amount</th>
                    <th className="border border-gray-300 p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{index + 1}</td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="text"
                          value={item.desc}
                          onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                          className="w-full p-1 border rounded text-sm"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border rounded text-sm"
                          min="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2 text-center">HR</td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {item.amount.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">{formData.vatRate}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {((item.amount * formData.vatRate) / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {(item.amount + (item.amount * formData.vatRate) / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          disabled={formData.items.length === 1}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VAT Rate Control */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">VAT Rate (%)</label>
            <input
              type="number"
              value={formData.vatRate}
              onChange={(e) => handleVatRateChange(parseFloat(e.target.value) || 0)}
              className="w-32 p-2 border rounded"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-right">
                <div className="flex justify-between">
                  <span>INVOICE TOTAL:</span>
                  <span>{formData.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Total:</span>
                  <span>{formData.totals.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Amount AED:</span>
                  <span>{formData.totals.total.toFixed(2)}</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>Received By: _________________</div>
                  <div>Signature: _________________</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border rounded"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button onClick={handleSaveInvoice} className="btn-secondary">
              💾 Save Invoice
            </button>
            <button onClick={handleDownload} className="btn-primary">
              📥 Download HTML
            </button>
            <button onClick={handlePrint} className="btn-primary">
              🖨️ Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}