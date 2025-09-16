import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { processSecureFinancialData, secureFilterData, generateSecureQuarterOptions } from '../utils/secureDataProcessor';

const Dashboard = () => {
  // State for data
  const [rawData, setRawData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for controls
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState('all'); // 'all', 'ccp', 'ltd'
  const [dateRange, setDateRange] = useState([0, 0]); // [startIndex, endIndex] for quarters
  const [quarterOptions, setQuarterOptions] = useState([]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await processSecureFinancialData();
        setRawData(data);
        
        // Generate quarter options
        const quarters = generateSecureQuarterOptions(data.dateRange.min, data.dateRange.max);
        setQuarterOptions(quarters);
        setDateRange([0, quarters.length - 1]);
        
        // Initialize with all companies selected
        setSelectedCompanies(data.companies);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update chart data when filters change
  useEffect(() => {
    if (!rawData || !quarterOptions.length) return;

    const startQuarter = quarterOptions[dateRange[0]];
    const endQuarter = quarterOptions[dateRange[1]];
    
    let filtered;
    try {
      filtered = secureFilterData(
        rawData.groupedData,
        selectedCompanies,
        startQuarter.year,
        endQuarter.year,
        startQuarter.quarter,
        endQuarter.quarter
      );
    } catch (filterError) {
      console.error('Filtering error:', filterError);
      setError(`Filtering failed: ${filterError.message}`);
      return;
    }

    // Prepare data for recharts
    const chartDataMap = new Map();
    
    filtered.forEach(item => {
      const key = item.quarterLabel;
      if (!chartDataMap.has(key)) {
        chartDataMap.set(key, {
          quarter: key,
          date: item.date,
          year: item.year,
          quarterNum: item.quarter
        });
      }
      
      const entry = chartDataMap.get(key);
      
      // Add company-specific data
      if (selectedMetrics === 'all' || selectedMetrics === 'ccp') {
        entry[`${item.company}_CCP`] = item.ccp;
      }
      if (selectedMetrics === 'all' || selectedMetrics === 'ltd') {
        entry[`${item.company}_LTD`] = item.ltd;
      }
    });

    // Convert to array and sort
    const chartArray = Array.from(chartDataMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    setChartData(chartArray);
  }, [rawData, selectedCompanies, selectedMetrics, dateRange, quarterOptions]);

  // Handle company selection with validation
  const handleCompanyChange = (company) => {
    try {
      if (company === 'all') {
        setSelectedCompanies(rawData?.companies || []);
      } else {
        // Validate that company exists in our data
        if (!rawData?.companies.includes(company)) {
          console.warn('Attempted to select invalid company:', company);
          return;
        }
        
        setSelectedCompanies(prev => {
          const newSelection = prev.includes(company)
            ? prev.filter(c => c !== company)
            : [...prev, company];
          
          // Limit selection to 20 companies for performance
          if (newSelection.length > 20) {
            console.warn('Too many companies selected, limiting to 20');
            return newSelection.slice(0, 20);
          }
          
          return newSelection;
        });
      }
    } catch (error) {
      console.error('Error handling company selection:', error);
    }
  };

  // Generate colors for companies with validation
  const getCompanyColor = (index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#2563eb', 
      '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2',
      '#be123c', '#047857', '#7c2d12'
    ];
    
    // Ensure index is a valid number
    const validIndex = Number.isInteger(index) && index >= 0 ? index : 0;
    return colors[validIndex % colors.length];
  };
  
  // Validate slider input
  const handleDateRangeChange = (newStart, newEnd) => {
    try {
      const start = parseInt(newStart, 10);
      const end = parseInt(newEnd, 10);
      
      if (isNaN(start) || isNaN(end)) return;
      if (start < 0 || end < 0) return;
      if (start >= quarterOptions.length || end >= quarterOptions.length) return;
      if (start > end) return;
      
      setDateRange([start, end]);
    } catch (error) {
      console.error('Error handling date range change:', error);
    }
  };
  
  // Validate metrics selection
  const handleMetricsChange = (newMetrics) => {
    const validMetrics = ['all', 'ccp', 'ltd'];
    if (validMetrics.includes(newMetrics)) {
      setSelectedMetrics(newMetrics);
    } else {
      console.warn('Invalid metrics selection:', newMetrics);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading financial data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading data: {error}</div>
      </div>
    );
  }

  if (!rawData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No data available</div>
      </div>
    );
  }

  // Prepare line components for chart
  const lines = [];
  let colorIndex = 0;

  selectedCompanies.forEach(company => {
    const baseColor = getCompanyColor(colorIndex++);
    
    if (selectedMetrics === 'all' || selectedMetrics === 'ccp') {
      lines.push(
        <Line
          key={`${company}_CCP`}
          type="monotone"
          dataKey={`${company}_CCP`}
          stroke={baseColor}
          strokeWidth={2}
          dot={{ r: 4 }}
          name={`${company} - CCP`}
        />
      );
    }
    
    if (selectedMetrics === 'all' || selectedMetrics === 'ltd') {
      lines.push(
        <Line
          key={`${company}_LTD`}
          type="monotone"
          dataKey={`${company}_LTD`}
          stroke={baseColor}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 4 }}
          name={`${company} - LTD`}
        />
      );
    }
  });

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Financial Data Dashboard
      </h1>
      
      {/* Controls */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Companies
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3 bg-white">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="all-companies"
                  checked={selectedCompanies.length === rawData.companies.length}
                  onChange={() => handleCompanyChange('all')}
                  className="mr-2"
                />
                <label htmlFor="all-companies" className="font-semibold">
                  All Companies
                </label>
              </div>
              {rawData.companies.map((company) => (
                <div key={company} className="flex items-center">
                  <input
                    type="checkbox"
                    id={company}
                    checked={selectedCompanies.includes(company)}
                    onChange={() => handleCompanyChange(company)}
                    className="mr-2"
                  />
                  <label htmlFor={company} className="text-sm">
                    {company}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Metrics
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="all-metrics"
                  name="metrics"
                  value="all"
                  checked={selectedMetrics === 'all'}
                  onChange={(e) => handleMetricsChange(e.target.value)}


                  className="mr-2"
                />
                <label htmlFor="all-metrics">All (CCP & LTD)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="ccp-only"
                  name="metrics"
                  value="ccp"
                  checked={selectedMetrics === 'ccp'}
                  onChange={(e) => handleMetricsChange(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="ccp-only">Current Cash Position (CCP) Only</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="ltd-only"
                  name="metrics"
                  value="ltd"
                  checked={selectedMetrics === 'ltd'}
                  onChange={(e) => handleMetricsChange(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="ltd-only">Long Term Debt (LTD) Only</label>
              </div>
            </div>
          </div>

          {/* Date Range Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600">Start Quarter</label>
                <input
                  type="range"
                  min="0"
                  max={quarterOptions.length - 1}
                  value={dateRange[0]}
                  onChange={(e) => handleDateRangeChange(e.target.value, dateRange[1])}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">
                  {quarterOptions[dateRange[0]]?.label}
                </span>
              </div>
              <div>
                <label className="block text-xs text-gray-600">End Quarter</label>
                <input
                  type="range"
                  min={dateRange[0]}
                  max={quarterOptions.length - 1}
                  value={dateRange[1]}
                  onChange={(e) => handleDateRangeChange(dateRange[0], e.target.value)}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">
                  {quarterOptions[dateRange[1]]?.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          Financial Trends: Current Cash Position (CCP) & Long Term Debt (LTD)
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="quarter" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value, name) => [`$${(value / 1000).toFixed(2)}K`, name]}
                labelFormatter={(label) => `Quarter: ${label}`}
              />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Summary */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Companies:</span>
            <div className="text-xl font-bold text-blue-600">{rawData.companies.length}</div>
          </div>
          <div>
            <span className="font-medium">Selected Companies:</span>
            <div className="text-xl font-bold text-green-600">{selectedCompanies.length}</div>
          </div>
          <div>
            <span className="font-medium">Data Points:</span>
            <div className="text-xl font-bold text-purple-600">{rawData.combinedData.length}</div>
          </div>
          <div>
            <span className="font-medium">Time Range:</span>
            <div className="text-xl font-bold text-orange-600">
              {quarterOptions[dateRange[0]]?.label} - {quarterOptions[dateRange[1]]?.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;