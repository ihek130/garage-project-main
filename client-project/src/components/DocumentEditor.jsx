import React, { useState, useEffect, useRef } from 'react';

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function DocumentEditor({ templateId, templateName, isOpen, onClose, onBack, invoiceData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen && templateId) {
      loadTemplate();
    }
  }, [isOpen, templateId]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      // First, render the template with form data
      const response = await fetch(`${API_BASE}/templates/render/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData || {}),
      });

      const result = await response.json();
      
      if (response.ok && result.file) {
        // Create the download URL for the template
        const fullUrl = result.file.url.startsWith('http') 
          ? result.file.url 
          : `${API_BASE}${result.file.url}`;
        
        setDocumentUrl(fullUrl);
      } else {
        alert(result.Message || 'Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = `${templateName || 'invoice'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    // Since we can't directly print Word docs in browser, we'll provide instructions
    alert('To print this document:\n1. Click "Download" to save the .docx file\n2. Open it in Microsoft Word\n3. Use Word\'s print function (Ctrl+P)');
  };

  const openInlineEditor = () => {
    setShowEditor(true);
  };

  const closeInlineEditor = () => {
    setShowEditor(false);
  };

  if (!isOpen) return null;

  if (showEditor) {
    // Inline editor view
    return (
      <div className="w-full h-full bg-white">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack || closeInlineEditor}
              className="btn-ghost text-sm"
            >
              ← Back to Template
            </button>
            <h3 className="font-semibold">{templateName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-primary text-sm"
              disabled={!documentUrl}
            >
              📥 Download
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary text-sm"
            >
              🖨️ Print Instructions
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">📝 How to Edit Your Invoice</h4>
              <ol className="text-sm text-blue-800 space-y-2">
                <li><strong>1. Download:</strong> Click the "Download" button above to save your personalized invoice template</li>
                <li><strong>2. Open in Word:</strong> Double-click the downloaded .docx file to open it in Microsoft Word</li>
                <li><strong>3. Edit Freely:</strong> Make any changes you want - add your logo, modify formatting, change text</li>
                <li><strong>4. Save & Print:</strong> Save your changes and print directly from Word</li>
              </ol>
            </div>

            {/* Invoice Preview Form */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h4 className="text-lg font-semibold mb-4">Invoice Preview Data</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Invoice No:</strong> {invoiceData?.invoice_no || 'Not set'}
                </div>
                <div>
                  <strong>Date:</strong> {invoiceData?.date || 'Not set'}
                </div>
                <div>
                  <strong>Customer:</strong> {invoiceData?.customer?.name || 'Not set'}
                </div>
                <div>
                  <strong>Address:</strong> {invoiceData?.customer?.address || 'Not set'}
                </div>
              </div>
              
              {invoiceData?.items && invoiceData.items.length > 0 && (
                <div className="mt-4">
                  <strong>Items:</strong>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-2 text-left">Description</th>
                          <th className="border p-2 text-right">Qty</th>
                          <th className="border p-2 text-right">Rate</th>
                          <th className="border p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="border p-2">{item.desc}</td>
                            <td className="border p-2 text-right">{item.qty}</td>
                            <td className="border p-2 text-right">{item.rate}</td>
                            <td className="border p-2 text-right">{item.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-right">
                    <div><strong>Subtotal:</strong> {invoiceData?.totals?.subtotal || 0}</div>
                    <div><strong>Tax:</strong> {invoiceData?.totals?.tax || 0}</div>
                    <div className="text-lg"><strong>Total:</strong> {invoiceData?.totals?.grand || 0}</div>
                  </div>
                </div>
              )}
              
              {invoiceData?.notes && (
                <div className="mt-4">
                  <strong>Notes:</strong> {invoiceData.notes}
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleDownload}
                className="btn-primary text-lg px-8 py-3"
                disabled={!documentUrl}
              >
                📥 Download Your Invoice Template
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal overlay view
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack || onClose}
              className="btn-ghost text-sm"
            >
              ← Back to Form
            </button>
            <h2 className="text-xl font-semibold">Invoice Template Ready</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost text-sm"
          >
            Close All
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p>Loading template...</p>
              </div>
            </div>
          ) : documentUrl ? (
            <div className="h-full flex flex-col">
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">✅ Template: {templateName}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Your personalized invoice template is ready! Choose how you want to proceed:
                </p>
              </div>
              
              {/* Action Options */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border-2 border-blue-200 rounded-lg text-center hover:border-blue-400 transition-colors">
                  <div className="text-4xl mb-4">📥</div>
                  <h4 className="font-semibold mb-2">Download & Edit</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Download the .docx file and open it in Microsoft Word for full editing capabilities
                  </p>
                  <button
                    onClick={handleDownload}
                    className="btn-primary w-full"
                    disabled={!documentUrl}
                  >
                    Download .docx File
                  </button>
                </div>

                <div className="p-6 border-2 border-green-200 rounded-lg text-center hover:border-green-400 transition-colors">
                  <div className="text-4xl mb-4">✏️</div>
                  <h4 className="font-semibold mb-2">Edit in App</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    View and edit your invoice data within the application
                  </p>
                  <button
                    onClick={openInlineEditor}
                    className="btn-secondary w-full"
                  >
                    Edit in App
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Tips:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• For professional editing, download and use Microsoft Word</li>
                  <li>• You can add your company logo, letterhead, and custom styling in Word</li>
                  <li>• The template includes all your invoice data with proper formatting</li>
                  <li>• Save the edited version and use it for future invoices</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500">No template loaded</p>
                <button
                  onClick={loadTemplate}
                  className="btn-primary mt-4"
                >
                  Reload Template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
