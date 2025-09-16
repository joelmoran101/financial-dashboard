import Papa from 'papaparse';

// Function to load and parse CSV files
export const loadCSVData = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
};

// Function to combine all data sources
export const processFinancialData = async () => {
  try {
    // Load all CSV files
    const [stocksData, formsData, tasksData] = await Promise.all([
      loadCSVData('/src/data/Stocks.csv'),
      loadCSVData('/src/data/Forms.csv'),
      loadCSVData('/src/data/Tasks.csv')
    ]);

    // Create lookup maps
    const stocksMap = new Map();
    stocksData.forEach(stock => {
      stocksMap.set(stock.CIK, {
        symbol: stock.Symbol,
        companyName: stock.CompanyName,
        cik: stock.CIK
      });
    });

    const formsMap = new Map();
    formsData.forEach(form => {
      formsMap.set(form.id, {
        id: form.id,
        cik: form.CIK,
        valueDate: form.ValueDate,
        filingDate: form.FilingDate,
        formName: form.FormName
      });
    });

    // Combine data
    const combinedData = [];
    tasksData.forEach(task => {
      const form = formsMap.get(task.Form_id);
      if (form) {
        const stock = stocksMap.get(form.cik);
        if (stock) {
          // Parse the value date to create quarters
          const valueDate = new Date(form.valueDate);
          const year = valueDate.getFullYear();
          const month = valueDate.getMonth();
          const quarter = Math.ceil((month + 1) / 3);
          
          combinedData.push({
            id: task.Form_id,
            company: stock.companyName,
            symbol: stock.symbol,
            cik: stock.cik,
            year: year,
            quarter: quarter,
            date: valueDate,
            dateString: form.valueDate,
            quarterLabel: `Q${quarter} ${year}`,
            ccp: parseFloat(task.CCP) || 0,
            ltd: parseFloat(task.LTD) || 0,
            formName: form.formName
          });
        }
      }
    });

    // Sort by date
    combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by company for easier processing
    const groupedData = {};
    combinedData.forEach(item => {
      if (!groupedData[item.company]) {
        groupedData[item.company] = [];
      }
      groupedData[item.company].push(item);
    });

    return {
      combinedData,
      groupedData,
      companies: [...new Set(combinedData.map(item => item.company))].sort(),
      dateRange: {
        min: Math.min(...combinedData.map(item => item.year)),
        max: Math.max(...combinedData.map(item => item.year))
      }
    };

  } catch (error) {
    console.error('Error processing financial data:', error);
    throw error;
  }
};

// Function to filter data based on selections
export const filterData = (groupedData, selectedCompanies, startYear, endYear, startQuarter = 1, endQuarter = 4) => {
  const filtered = [];
  
  Object.keys(groupedData).forEach(company => {
    if (selectedCompanies.length === 0 || selectedCompanies.includes(company)) {
      const companyData = groupedData[company].filter(item => {
        const isInYearRange = item.year >= startYear && item.year <= endYear;
        
        // Handle quarter filtering
        if (item.year === startYear && item.year === endYear) {
          return isInYearRange && item.quarter >= startQuarter && item.quarter <= endQuarter;
        } else if (item.year === startYear) {
          return isInYearRange && item.quarter >= startQuarter;
        } else if (item.year === endYear) {
          return isInYearRange && item.quarter <= endQuarter;
        } else {
          return isInYearRange;
        }
      });
      
      filtered.push(...companyData);
    }
  });
  
  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Generate quarters for the slider
export const generateQuarterOptions = (minYear, maxYear) => {
  const quarters = [];
  for (let year = minYear; year <= maxYear; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      quarters.push({
        value: `${year}-Q${quarter}`,
        label: `Q${quarter} ${year}`,
        year: year,
        quarter: quarter
      });
    }
  }
  return quarters;
};