import Papa from 'papaparse';

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size
const MAX_ROWS = 10000; // Maximum number of rows to process
const ALLOWED_COLUMNS = {
  stocks: ['Symbol', 'CompanyName', 'CIK'],
  forms: ['id', 'FormName', 'CIK', 'ValueDate', 'FilingDate', 'FormURL'],
  tasks: ['Form_id', 'TextListLen', 'TableIndex', 'SumDivider', 'JsonTable', 'ValueColumn', 'CCP', 'LTD']
};

// Input validation functions
const validateString = (value, maxLength = 255) => {
  if (typeof value !== 'string') return null;
  // Remove potentially dangerous characters and limit length
  return value.replace(/[<>\"'&]/g, '').trim().substring(0, maxLength);
};

const validateNumber = (value, min = -Infinity, max = Infinity) => {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < min || num > max) return null;
  return num;
};

const validateInteger = (value, min = -Infinity, max = Infinity) => {
  const num = parseInt(value, 10);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < min || num > max) return null;
  return num;
};

const validateDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  // Basic date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return null;
  
  const date = new Date(dateString);
  // Check if date is valid and within reasonable range (1900-2030)
  if (isNaN(date.getTime())) return null;
  if (date.getFullYear() < 1900 || date.getFullYear() > 2030) return null;
  
  return date;
};

const validateURL = (urlString) => {
  if (!urlString || typeof urlString !== 'string') return null;
  
  try {
    const url = new URL(urlString);
    // Only allow HTTPS URLs from sec.gov
    if (url.protocol === 'https:' && url.hostname.endsWith('sec.gov')) {
      return url.href;
    }
  } catch (error) {
    // Invalid URL
  }
  return null;
};

// Sanitize CSV data based on expected schema
const sanitizeStockData = (row) => {
  const symbol = validateString(row.Symbol, 10);
  const companyName = validateString(row.CompanyName, 200);
  const cik = validateInteger(row.CIK, 1, 9999999999);
  
  if (!symbol || !companyName || !cik) return null;
  
  return {
    symbol,
    companyName,
    cik: cik.toString() // Keep as string for consistency
  };
};

const sanitizeFormData = (row) => {
  const id = validateInteger(row.id, 1, MAX_ROWS);
  const formName = validateString(row.FormName, 100);
  const cik = validateInteger(row.CIK, 1, 9999999999);
  const valueDate = validateDate(row.ValueDate);
  const filingDate = validateDate(row.FilingDate);
  const formURL = validateURL(row.FormURL);
  
  if (!id || !formName || !cik || !valueDate || !filingDate || !formURL) return null;
  
  return {
    id: id.toString(),
    formName,
    cik: cik.toString(),
    valueDate: valueDate.toISOString().split('T')[0], // Keep as YYYY-MM-DD
    filingDate: filingDate.toISOString().split('T')[0],
    formURL
  };
};

const sanitizeTaskData = (row) => {
  const formId = validateInteger(row.Form_id, 1, MAX_ROWS);
  const ccp = validateNumber(row.CCP, 0, Number.MAX_SAFE_INTEGER);
  const ltd = validateNumber(row.LTD, 0, Number.MAX_SAFE_INTEGER);
  
  // Other fields are optional but should be validated if present
  const textListLen = row.TextListLen ? validateInteger(row.TextListLen, 0, 1000) : null;
  const tableIndex = row.TableIndex ? validateInteger(row.TableIndex, 0, 100) : null;
  const sumDivider = row.SumDivider ? validateNumber(row.SumDivider, 0.001, 10000) : 1;
  const jsonTable = row.JsonTable ? validateInteger(row.JsonTable, 0, 1) : null;
  const valueColumn = row.ValueColumn ? validateInteger(row.ValueColumn, 0, 10) : null;
  
  if (formId === null || ccp === null || ltd === null) return null;
  
  return {
    formId: formId.toString(),
    ccp,
    ltd,
    textListLen,
    tableIndex,
    sumDivider,
    jsonTable,
    valueColumn
  };
};

// Secure CSV loading function
export const loadSecureCSV = async (filePath, expectedColumns, maxRows = MAX_ROWS) => {
  return new Promise(async (resolve, reject) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout

      const response = await fetch(filePath, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv,text/plain,*/*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('text/') && !contentType.includes('application/')) {
        throw new Error('Invalid content type');
      }

      // Check file size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error('File too large');
      }

      const csvText = await response.text();
      
      // Additional size check
      if (csvText.length > MAX_FILE_SIZE) {
        throw new Error('File content too large');
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        preview: maxRows, // Limit number of rows
        complete: (results) => {
          try {
            // Validate structure
            if (!results.data || !Array.isArray(results.data)) {
              throw new Error('Invalid CSV structure');
            }

            if (results.data.length === 0) {
              throw new Error('Empty CSV file');
            }

            // Check if required columns exist
            const firstRow = results.data[0];
            const missingColumns = expectedColumns.filter(col => !(col in firstRow));
            if (missingColumns.length > 0) {
              throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }

            // Check for unexpected columns (potential injection attempt)
            const actualColumns = Object.keys(firstRow);
            const unexpectedColumns = actualColumns.filter(col => !expectedColumns.includes(col));
            if (unexpectedColumns.length > 0) {
              console.warn(`Unexpected columns found: ${unexpectedColumns.join(', ')}`);
            }

            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }

            resolve(results.data);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Main secure data processing function
export const processSecureFinancialData = async () => {
  try {
    console.log('Loading CSV files...');
    
    // Load all CSV files with validation
    const [stocksData, formsData, tasksData] = await Promise.all([
      loadSecureCSV('/data/Stocks.csv', ALLOWED_COLUMNS.stocks),
      loadSecureCSV('/data/Forms.csv', ALLOWED_COLUMNS.forms),
      loadSecureCSV('/data/Tasks.csv', ALLOWED_COLUMNS.tasks)
    ]);

    console.log(`Loaded ${stocksData.length} stock records, ${formsData.length} form records, ${tasksData.length} task records`);

    // Sanitize data
    const sanitizedStocks = stocksData
      .map(sanitizeStockData)
      .filter(Boolean); // Remove null entries

    const sanitizedForms = formsData
      .map(sanitizeFormData)
      .filter(Boolean);

    const sanitizedTasks = tasksData
      .map(sanitizeTaskData)
      .filter(Boolean);

    console.log(`After sanitization: ${sanitizedStocks.length} stocks, ${sanitizedForms.length} forms, ${sanitizedTasks.length} tasks`);

    // Create lookup maps with size limits
    if (sanitizedStocks.length > 1000) {
      throw new Error('Too many stock records');
    }
    if (sanitizedForms.length > 5000) {
      throw new Error('Too many form records');
    }
    if (sanitizedTasks.length > 10000) {
      throw new Error('Too many task records');
    }

    const stocksMap = new Map();
    sanitizedStocks.forEach(stock => {
      stocksMap.set(stock.cik, stock);
    });

    const formsMap = new Map();
    sanitizedForms.forEach(form => {
      formsMap.set(form.id, form);
    });

    // Combine data with additional validation
    const combinedData = [];
    const processedFormIds = new Set(); // Prevent duplicate processing

    sanitizedTasks.forEach(task => {
      if (processedFormIds.has(task.formId)) {
        return; // Skip duplicates
      }
      processedFormIds.add(task.formId);

      const form = formsMap.get(task.formId);
      if (!form) return;

      const stock = stocksMap.get(form.cik);
      if (!stock) return;

      // Additional validation for combined data
      const valueDate = new Date(form.valueDate);
      if (isNaN(valueDate.getTime())) return;

      const year = valueDate.getFullYear();
      const month = valueDate.getMonth();
      const quarter = Math.ceil((month + 1) / 3);

      // Validate financial figures are reasonable
      if (task.ccp < 0 || task.ltd < 0) return;
      if (task.ccp > 1e12 || task.ltd > 1e12) return; // Sanity check: no more than $1T

      combinedData.push({
        id: task.formId,
        company: stock.companyName,
        symbol: stock.symbol,
        cik: stock.cik,
        year: year,
        quarter: quarter,
        date: valueDate,
        dateString: form.valueDate,
        quarterLabel: `Q${quarter} ${year}`,
        ccp: task.ccp,
        ltd: task.ltd,
        formName: form.formName,
        formURL: form.formURL
      });
    });

    if (combinedData.length === 0) {
      throw new Error('No valid data after processing and validation');
    }

    // Sort by date
    combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by company
    const groupedData = {};
    combinedData.forEach(item => {
      if (!groupedData[item.company]) {
        groupedData[item.company] = [];
      }
      groupedData[item.company].push(item);
    });

    const companies = Object.keys(groupedData).sort();
    const years = [...new Set(combinedData.map(item => item.year))].sort((a, b) => a - b);

    if (companies.length === 0 || years.length === 0) {
      throw new Error('No companies or years found in processed data');
    }

    console.log(`Successfully processed data for ${companies.length} companies across ${years.length} years`);

    return {
      combinedData,
      groupedData,
      companies,
      dateRange: {
        min: Math.min(...years),
        max: Math.max(...years)
      },
      stats: {
        totalRecords: combinedData.length,
        companiesCount: companies.length,
        yearsSpan: years.length,
        dataQuality: {
          stocksSanitized: sanitizedStocks.length,
          formsSanitized: sanitizedForms.length,
          tasksSanitized: sanitizedTasks.length,
          originalStocks: stocksData.length,
          originalForms: formsData.length,
          originalTasks: tasksData.length
        }
      }
    };

  } catch (error) {
    console.error('Secure data processing error:', error);
    throw new Error(`Data processing failed: ${error.message}`);
  }
};

// Secure filtering function
export const secureFilterData = (groupedData, selectedCompanies, startYear, endYear, startQuarter = 1, endQuarter = 4) => {
  // Validate inputs
  const validStartYear = validateInteger(startYear, 1900, 2030);
  const validEndYear = validateInteger(endYear, 1900, 2030);
  const validStartQuarter = validateInteger(startQuarter, 1, 4);
  const validEndQuarter = validateInteger(endQuarter, 1, 4);

  if (!validStartYear || !validEndYear || !validStartQuarter || !validEndQuarter) {
    throw new Error('Invalid filter parameters');
  }

  if (validStartYear > validEndYear) {
    throw new Error('Start year cannot be after end year');
  }

  if (!Array.isArray(selectedCompanies)) {
    throw new Error('Selected companies must be an array');
  }

  // Limit number of selected companies
  if (selectedCompanies.length > 50) {
    throw new Error('Too many companies selected');
  }

  // Validate company names
  const sanitizedCompanies = selectedCompanies
    .map(company => validateString(company, 200))
    .filter(Boolean);

  const filtered = [];
  
  Object.keys(groupedData).forEach(company => {
    // Check if company is in our sanitized list
    if (sanitizedCompanies.length === 0 || sanitizedCompanies.includes(company)) {
      const companyData = groupedData[company].filter(item => {
        const isInYearRange = item.year >= validStartYear && item.year <= validEndYear;
        
        // Handle quarter filtering
        if (item.year === validStartYear && item.year === validEndYear) {
          return isInYearRange && item.quarter >= validStartQuarter && item.quarter <= validEndQuarter;
        } else if (item.year === validStartYear) {
          return isInYearRange && item.quarter >= validStartQuarter;
        } else if (item.year === validEndYear) {
          return isInYearRange && item.quarter <= validEndQuarter;
        } else {
          return isInYearRange;
        }
      });
      
      filtered.push(...companyData);
    }
  });
  
  // Limit result size
  if (filtered.length > 5000) {
    console.warn('Large result set, limiting to first 5000 records');
    return filtered.slice(0, 5000).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Generate quarters with validation
export const generateSecureQuarterOptions = (minYear, maxYear) => {
  const validMinYear = validateInteger(minYear, 1900, 2030);
  const validMaxYear = validateInteger(maxYear, 1900, 2030);
  
  if (!validMinYear || !validMaxYear) {
    throw new Error('Invalid year range');
  }
  
  if (validMinYear > validMaxYear) {
    throw new Error('Invalid year range: min > max');
  }
  
  if (validMaxYear - validMinYear > 50) {
    throw new Error('Year range too large');
  }
  
  const quarters = [];
  for (let year = validMinYear; year <= validMaxYear; year++) {
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