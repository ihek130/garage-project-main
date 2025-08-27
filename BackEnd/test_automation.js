const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAutomation() {
    console.log('🧪 Testing Income & Expense Automation System');
    console.log('===========================================');
    
    try {
        // Test 1: Create a new salary entry
        console.log('\n1️⃣ Testing Salary → Expense Automation');
        console.log('--------------------------------------');
        
        const salaryData = {
            name: 'Test Employee',
            job_title: 'Mechanic',
            date: new Date().toISOString().split('T')[0],
            overtime_hours: 5,
            advance_taken: 100,
            total_salary: 1500,
            salary_status: 'cash'
        };
        
        console.log('Creating salary entry:', salaryData);
        const salaryResponse = await axios.post(`${BASE_URL}/employeesalary/post/Esalary`, salaryData);
        console.log('✅ Salary created:', salaryResponse.data);
        
        // Wait a moment for automation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if expense was created
        const expensesResponse = await axios.get(`${BASE_URL}/expenses/get/E-expenses`);
        const salaryExpenses = expensesResponse.data.rows?.filter(e => 
            e.source_type === 'employee_salary' && e.name.includes('Test Employee')
        ) || [];
        
        console.log(`Found ${salaryExpenses.length} salary expense entries`);
        if (salaryExpenses.length > 0) {
            console.log('✅ Salary expense automation working!');
            console.log('Latest expense:', salaryExpenses[0]);
        } else {
            console.log('❌ Salary expense automation not working');
        }
        
        // Test 2: Test advance payment
        console.log('\n2️⃣ Testing Advance → Expense Automation');
        console.log('--------------------------------------');
        
        if (salaryResponse.data.salaryId) {
            const advanceData = {
                employeeId: salaryResponse.data.salaryId,
                advanceAmount: 200,
                date: new Date().toISOString().split('T')[0],
                reason: 'Emergency advance'
            };
            
            console.log('Adding advance payment:', advanceData);
            const advanceResponse = await axios.post(`${BASE_URL}/employeesalary/add-advance`, advanceData);
            console.log('✅ Advance added:', advanceResponse.data);
            
            // Wait a moment for automation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if advance expense was created
            const updatedExpensesResponse = await axios.get(`${BASE_URL}/expenses/get/E-expenses`);
            const advanceExpenses = updatedExpensesResponse.data.rows?.filter(e => 
                e.source_type === 'employee_advance' && e.name.includes('Test Employee')
            ) || [];
            
            console.log(`Found ${advanceExpenses.length} advance expense entries`);
            if (advanceExpenses.length > 0) {
                console.log('✅ Advance expense automation working!');
                console.log('Latest advance expense:', advanceExpenses[0]);
            } else {
                console.log('❌ Advance expense automation not working');
            }
        }
        
        // Test 3: Create an invoice and mark it as received
        console.log('\n3️⃣ Testing Invoice Payment → Income Automation');
        console.log('--------------------------------------------');
        
        const invoiceData = {
            customer_name: 'Test Customer',
            description: 'Test service',
            amount: 1000,
            advance: 0,
            pending: 1000,
            status: 'pending',
            date: new Date().toISOString().split('T')[0]
        };
        
        console.log('Creating invoice:', invoiceData);
        const invoiceResponse = await axios.post(`${BASE_URL}/pending/derived/add`, invoiceData);
        console.log('✅ Invoice created:', invoiceResponse.data);
        
        // Simulate payment received
        const paymentData = {
            amountReceived: 600
        };
        
        // For this test, we need to find the invoice ID. Let's check pending invoices
        const pendingResponse = await axios.get(`${BASE_URL}/pending/derived/list`);
        const testInvoice = pendingResponse.data.find(inv => 
            inv.customer_name === 'Test Customer' && inv.description === 'Test service'
        );
        
        if (testInvoice) {
            console.log('Marking invoice as partially paid:', paymentData);
            const paymentResponse = await axios.patch(
                `${BASE_URL}/pending/derived/mark-received/${testInvoice.id}`, 
                paymentData
            );
            console.log('✅ Payment processed:', paymentResponse.data);
            
            // Wait a moment for automation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if income was created
            const incomeResponse = await axios.get(`${BASE_URL}/income/get/E-income`);
            const paymentIncome = incomeResponse.data.rows?.filter(i => 
                i.source_type === 'invoice_payment' && i.source.includes('Test Customer')
            ) || [];
            
            console.log(`Found ${paymentIncome.length} payment income entries`);
            if (paymentIncome.length > 0) {
                console.log('✅ Invoice payment income automation working!');
                console.log('Latest income:', paymentIncome[0]);
            } else {
                console.log('❌ Invoice payment income automation not working');
            }
        } else {
            console.log('❌ Could not find test invoice for payment test');
        }
        
        console.log('\n🎉 Automation testing completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error.response?.data || error.message);
    }
}

// Run the test
testAutomation();
