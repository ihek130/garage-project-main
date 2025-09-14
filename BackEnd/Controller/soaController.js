const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

// Database connection
const dbPath = path.join(__dirname, '../database.db');

// Get all companies for SOA dropdown
const getCompanies = (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        SELECT DISTINCT Company 
        FROM employee_task 
        WHERE Company IS NOT NULL AND Company != '' 
        ORDER BY Company ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching companies:', err);
            return res.status(500).json({ error: 'Failed to fetch companies' });
        }
        
        const companies = rows.map(row => row.Company);
        res.json(companies);
    });
    
    db.close();
};

// Get SOA data based on filters
const getSOAData = (req, res) => {
    const { company, startDate, endDate } = req.query;
    
    if (!company) {
        return res.status(400).json({ error: 'Company is required' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    let query = `
        SELECT 
            id,
            Employee,
            Company,
            Date,
            Title,
            Details,
            Hours,
            Rate,
            Amount,
            Status,
            Location,
            Vehicle,
            timesheet_no,
            bill_number,
            invoice_id
        FROM employee_task 
        WHERE Company = ?
    `;
    
    const params = [company];
    
    if (startDate) {
        query += ' AND Date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND Date <= ?';
        params.push(endDate);
    }
    
    query += ' ORDER BY Date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching SOA data:', err);
            return res.status(500).json({ error: 'Failed to fetch SOA data' });
        }
        
        // Calculate summary
        const summary = {
            totalRecords: rows.length,
            totalHours: rows.reduce((sum, row) => sum + (row.Hours || 0), 0),
            totalAmount: rows.reduce((sum, row) => sum + (row.Amount || 0), 0),
            uniqueEmployees: new Set(rows.map(row => row.Employee)).size
        };
        
        res.json({
            data: rows,
            summary: summary
        });
    });
    
    db.close();
};

// Download SOA as PDF
const downloadPDF = (req, res) => {
    const { company, startDate, endDate } = req.query;
    
    if (!company) {
        return res.status(400).json({ error: 'Company is required' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    let query = `
        SELECT 
            id,
            Employee,
            Company,
            Date,
            Title,
            Details,
            Hours,
            Rate,
            Amount,
            Status,
            Location,
            Vehicle,
            timesheet_no,
            bill_number,
            invoice_id
        FROM employee_task 
        WHERE Company = ?
    `;
    
    const params = [company];
    
    if (startDate) {
        query += ' AND Date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND Date <= ?';
        params.push(endDate);
    }
    
    query += ' ORDER BY Date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching data for PDF:', err);
            return res.status(500).json({ error: 'Failed to fetch data for PDF' });
        }
        
        try {
            // Import jsPDF here to avoid module loading issues
            const { jsPDF } = require('jspdf');
            require('jspdf-autotable');
            
            const doc = new jsPDF('landscape');
            
            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Statement of Account (SOA)', 20, 25);
            
            // Company info
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Company: ${company}`, 20, 40);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50);
            
            if (startDate || endDate) {
                const period = `Period: ${startDate || 'All'} to ${endDate || 'All'}`;
                doc.text(period, 20, 60);
            }
            
            // Summary
            const totalHours = rows.reduce((sum, row) => sum + (row.Hours || 0), 0);
            const totalAmount = rows.reduce((sum, row) => sum + (row.Amount || 0), 0);
            
            doc.text(`Total Records: ${rows.length}`, 200, 40);
            doc.text(`Total Hours: ${totalHours}`, 200, 50);
            doc.text(`Total Amount: AED ${totalAmount.toFixed(2)}`, 200, 60);
            
            // Table data
            const tableData = rows.map(row => [
                row.Date || '',
                row.timesheet_no || '',
                row.bill_number || '',
                row.Employee || '',
                row.Hours || 0,
                row.Vehicle || '',
                `AED ${(row.Rate || 0).toFixed(2)}`,
                `AED ${(row.Amount || 0).toFixed(2)}`,
                row.Status || ''
            ]);
            
            // Table
            autoTable(doc, {
                head: [['Date', 'Timesheet No.', 'Bill No.', 'Employee', 'Hours', 'Vehicle', 'Rate', 'Amount', 'Status']],
                body: tableData,
                startY: 75,
                styles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                },
                columnStyles: {
                    4: { halign: 'center' }, // Hours
                    6: { halign: 'right' },  // Rate
                    7: { halign: 'right' }   // Amount
                }
            });
            
            // Generate filename
            const filename = `SOA_${company}_${startDate || 'all'}_${endDate || 'all'}.pdf`;
            
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Send PDF
            const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    });
    
    db.close();
};

// Download SOA as Excel
const downloadExcel = (req, res) => {
    const { company, startDate, endDate } = req.query;
    
    if (!company) {
        return res.status(400).json({ error: 'Company is required' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    let query = `
        SELECT 
            id,
            Employee,
            Company,
            Date,
            Title,
            Details,
            Hours,
            Rate,
            Amount,
            Status,
            Location,
            Vehicle,
            timesheet_no,
            bill_number,
            invoice_id
        FROM employee_task 
        WHERE Company = ?
    `;
    
    const params = [company];
    
    if (startDate) {
        query += ' AND Date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND Date <= ?';
        params.push(endDate);
    }
    
    query += ' ORDER BY Date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching data for Excel:', err);
            return res.status(500).json({ error: 'Failed to fetch data for Excel' });
        }
        
        try {
            // Create a new workbook
            const workbook = XLSX.utils.book_new();
            
            // Header info
            const headerData = [
                ['Statement of Account (SOA)'],
                [''],
                ['Company:', company],
                ['Generated:', new Date().toLocaleDateString()],
                ['Period:', `${startDate || '2025-09-04'} to ${endDate || 'All'}`],
                [''],
                ['Summary:'],
                ['Total Records:', rows.length],
                ['Total Hours:', rows.reduce((sum, row) => sum + (row.Hours || 0), 0)],
                ['Total Amount (AED):', rows.reduce((sum, row) => sum + (row.Amount || 0), 0)],
                [''],
                ['Detailed Records:'],
                ['']
            ];
            
            // Table headers
            const tableHeaders = [
                'Date', 'Timesheet No.', 'Bill Number', 'Employee', 'Title', 'Details', 
                'Hours', 'Vehicle', 'Rate (AED)', 'Amount (AED)', 'Status', 'Location'
            ];
            
            // Table data
            const tableData = rows.map(row => [
                row.Date || '',
                row.timesheet_no || '',
                row.bill_number || '',
                row.Employee || '',
                row.Title || '',
                row.Details || '',
                row.Hours || 0,
                row.Vehicle || '',
                row.Rate || 0,
                row.Amount || 0,
                row.Status || '',
                row.Location || ''
            ]);
            
            // Combine all data
            const allData = [
                ...headerData,
                tableHeaders,
                ...tableData
            ];
            
            // Create worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(allData);
            
            // Set column widths
            const columnWidths = [
                { wch: 12 }, // Date
                { wch: 15 }, // Timesheet No.
                { wch: 15 }, // Bill Number
                { wch: 15 }, // Employee
                { wch: 20 }, // Title
                { wch: 30 }, // Details
                { wch: 8 },  // Hours
                { wch: 15 }, // Vehicle
                { wch: 12 }, // Rate
                { wch: 12 }, // Amount
                { wch: 10 }, // Status
                { wch: 15 }  // Location
            ];
            worksheet['!cols'] = columnWidths;
            
            // Style the header
            const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
            for (let i = 0; i < 13; i++) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
                if (worksheet[cellRef]) {
                    worksheet[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'E3F2FD' } }
                    };
                }
            }
            
            // Style the table header row
            const headerRowIndex = 13;
            for (let col = 0; col < tableHeaders.length; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                if (worksheet[cellRef]) {
                    worksheet[cellRef].s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' } },
                        fill: { fgColor: { rgb: '2980B9' } },
                        alignment: { horizontal: 'center' }
                    };
                }
            }
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'SOA');
            
            // Generate filename
            const filename = `SOA_${company}_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
            
            // Generate Excel buffer
            const excelBuffer = XLSX.write(workbook, { 
                type: 'buffer', 
                bookType: 'xlsx',
                cellStyles: true
            });
            
            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Send Excel file
            res.send(excelBuffer);
            
        } catch (error) {
            console.error('Error generating Excel:', error);
            res.status(500).json({ error: 'Failed to generate Excel file' });
        }
    });
    
    db.close();
};

module.exports = {
    getCompanies,
    getSOAData,
    getSOASummary: getSOAData, // Alias for summary
    getMonthlyBreakdown: getSOAData, // Alias for monthly
    downloadSOAPDF: downloadPDF,
    downloadSOAExcel: downloadExcel
};