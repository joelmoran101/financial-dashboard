# 📊 Financial Data Dashboard

A secure, interactive React dashboard for visualizing **Current Cash Position (CCP)** and **Long Term Debt (LTD)** trends across multiple companies over time.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-green)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Vite](https://img.shields.io/badge/Vite-5.0.12-yellow)
![Security](https://img.shields.io/badge/Security-Enhanced-red)

## 🚀 Features

### 📈 Data Visualization
- **Interactive Line Charts** using Recharts library
- **Multi-company Comparison** with color-coded lines  
- **Flexible Metrics Selection**: View CCP, LTD, or both
- **Quarterly Time Filtering** with intuitive slider controls
- **Responsive Design** that works on all devices

### 🔐 Security Features
- **Input Validation & Sanitization** for all CSV data
- **File Size Limits** to prevent DoS attacks
- **URL Validation** (only HTTPS SEC.gov URLs allowed)
- **XSS Protection** through Content Security Policy
- **Rate Limiting** and request timeouts
- **Data Type Validation** with reasonable bounds checking

### 🏢 Company Data
Supports financial data for major companies including:
- Amazon (AMZN)
- Apple Inc. (AAPL)
- ConocoPhillips (COP)
- Henry Schein (HSIC)
- And more...

## 🛠️ Technology Stack

- **Frontend**: React 18.2 with Vite
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS for responsive design
- **Data Processing**: PapaParse for secure CSV handling
- **Security**: Custom validation and sanitization layers

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (compatible with Node 18.20.4)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/joelmoran101/financial-dashboard.git
   cd financial-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Quick Test
Run the data validation test:
```bash
npm run test
```
This will open `test.html` to verify CSV data loading and processing.

## 📁 Project Structure

```
financial-dashboard/
├── public/
│   └── data/           # CSV data files
│       ├── Forms.csv   # SEC filing information
│       ├── Stocks.csv  # Company stock symbols and info
│       └── Tasks.csv   # Financial metrics (CCP/LTD)
├── src/
│   ├── components/
│   │   └── Dashboard.jsx        # Main dashboard component
│   ├── utils/
│   │   ├── dataProcessor.js     # Basic data processing
│   │   └── secureDataProcessor.js # Secure data handling
│   ├── App.jsx         # Root component
│   └── main.jsx        # Application entry point
├── test.html           # Data validation test page
└── vite.config.js      # Vite configuration with security headers
```

## 💾 Data Format

The dashboard processes three CSV files:

### Stocks.csv
```csv
Symbol,CompanyName,CIK
AMZN,Amazon,1018724
AAPL,Apple Inc.,320193
```

### Forms.csv  
```csv
id,FormName,CIK,ValueDate,FilingDate,FormURL
1,aapl-20231230,320193,2023-12-30,2024-02-02,https://sec.gov/...
```

### Tasks.csv
```csv
Form_id,CCP,LTD
1,73100.0,106042.0
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file for custom configuration:
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_MAX_FILE_SIZE=10485760  # 10MB
VITE_MAX_COMPANIES=50
```

### Security Settings
Security configurations in `vite.config.js`:
- CSP headers for XSS protection
- File size limits
- Request timeouts
- CORS policies

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🔒 Security Considerations

- **Data Validation**: All CSV inputs are validated and sanitized
- **File Size Limits**: 10MB maximum file size
- **URL Restrictions**: Only HTTPS SEC.gov URLs are allowed
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Error Handling**: Graceful degradation with user feedback
- **Memory Safety**: Limits on data processing to prevent memory exhaustion

## 📊 Usage Examples

### Select Multiple Companies
```javascript
// Dashboard allows selection of multiple companies
const selectedCompanies = ['Apple Inc.', 'Amazon', 'ConocoPhillips'];
```

### Filter by Date Range
```javascript
// Filter data by quarters
const dateRange = {
  start: { year: 2019, quarter: 1 },
  end: { year: 2023, quarter: 4 }
};
```

### Metric Selection
```javascript
// Choose which metrics to display
const metrics = 'all'; // 'all', 'ccp', or 'ltd'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [https://github.com/joelmoran101/financial-dashboard](https://github.com/joelmoran101/financial-dashboard)
- **Live Demo**: [Coming Soon]
- **Issues**: [Report a bug](https://github.com/joelmoran101/financial-dashboard/issues)

## 👨‍💻 Author

**Joel Moran**
- GitHub: [@joelmoran101](https://github.com/joelmoran101)
- LinkedIn: [Joel Moran](https://linkedin.com/in/joel-moran)

---

⭐ **Star this repo** if you find it helpful!