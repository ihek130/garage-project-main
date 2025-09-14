import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, FileText, Eye, Users, DollarSign, Clock, Truck } from 'lucide-react';

const SOA = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [soaData, setSoaData] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Get API URL from environment
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    // Load companies on component mount
    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await fetch(`${API_URL}/api/soa/companies`);
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            console.error('Error fetching companies:', error);
            setError('Failed to load companies');
        }
    };

    const fetchSOAData = async () => {
        if (!selectedCompany) {
            setError('Please select a company');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let url = `${API_URL}/api/soa/data?company=${encodeURIComponent(selectedCompany)}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url);
            const result = await response.json();

            if (response.ok) {
                setSoaData(result.data || []);
                setSummary(result.summary || {});
                setShowPreview(true);
            } else {
                setError(result.error || 'Failed to fetch SOA data');
            }
        } catch (error) {
            console.error('Error fetching SOA data:', error);
            setError('Failed to fetch SOA data');
        } finally {
            setLoading(false);
        }
    };

    const downloadSOA = async (format) => {
        if (!selectedCompany || soaData.length === 0) {
            setError('No data to download');
            return;
        }

        try {
            let url = `${API_URL}/soa/download/${format}?company=${encodeURIComponent(selectedCompany)}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url);
            
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                
                const filename = `SOA_${selectedCompany}_${startDate || 'all'}_${endDate || 'all'}.${format}`;
                link.download = filename;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            } else {
                const error = await response.json();
                setError(error.error || `Failed to download ${format.toUpperCase()}`);
            }
        } catch (error) {
            console.error(`Error downloading ${format}:`, error);
            setError(`Failed to download ${format.toUpperCase()}`);
        }
    };

    const resetFilters = () => {
        setSelectedCompany('');
        setStartDate('');
        setEndDate('');
        setSoaData([]);
        setSummary({});
        setShowPreview(false);
        setError('');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-AE');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Statement of Account (SOA)
                    </h1>
                    <p className="text-gray-600">
                        Generate detailed statements of account for companies based on selected time periods
                    </p>
                </div>

                {/* Filters Card */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center mb-4">
                        <Filter className="w-5 h-5 text-blue-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Company Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company *
                            </label>
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Company</option>
                                {companies.map((company) => (
                                    <option key={company} value={company}>
                                        {company}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-end space-x-2">
                            <button
                                onClick={fetchSOAData}
                                disabled={loading || !selectedCompany}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                    </>
                                )}
                            </button>
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                {showPreview && soaData.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center">
                                <FileText className="w-8 h-8 text-blue-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Records</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.totalRecords || soaData.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center">
                                <Clock className="w-8 h-8 text-green-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.totalHours || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center">
                                <DollarSign className="w-8 h-8 text-yellow-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center">
                                <Users className="w-8 h-8 text-purple-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Employees</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.uniqueEmployees || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Preview */}
                {showPreview && soaData.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md mb-6">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    SOA Preview - {selectedCompany}
                                </h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => downloadSOA('pdf')}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => downloadSOA('excel')}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Excel
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timesheet No.
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Bill No.
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Hours
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vehicle
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rate
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {soaData.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(record.Date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.timesheet_no}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.bill_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.Employee}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.Hours}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center">
                                                    <Truck className="w-4 h-4 text-gray-400 mr-2" />
                                                    {record.Vehicle || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(record.Rate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatCurrency(record.Amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    record.Status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : record.Status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {record.Status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* No Data Message */}
                {showPreview && soaData.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
                        <p className="text-gray-600">
                            No records found for the selected company and date range.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SOA;