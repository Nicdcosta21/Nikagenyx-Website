// Environment configuration for Nikagenyx Accounting System

module.exports = {
  // Database connection
  db: {
    url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/nikagenyx_accounting',
    ssl: process.env.NODE_ENV === 'production'
  },
  
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
    tokenExpiry: process.env.TOKEN_EXPIRY || '24h',
    mfaRequired: process.env.MFA_REQUIRED === 'true'
  },
  
  // File storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'dropbox', // 'dropbox' or 's3'
    dropbox: {
      appKey: process.env.DROPBOX_APP_KEY,
      appSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      folder: process.env.DROPBOX_FOLDER || '/nikagenyx_accounting'
    },
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'ap-south-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  },
  
  // Application settings
  app: {
    name: 'Nikagenyx Accounting System',
    baseUrl: process.env.BASE_URL || 'https://nikagenyx.com',
    accountsPath: process.env.ACCOUNTS_PATH || '/accounts',
    companyName: process.env.COMPANY_NAME || 'Nikagenyx',
    companyGstin: process.env.COMPANY_GSTIN,
    financialYearStart: process.env.FINANCIAL_YEAR_START || '04-01', // MM-DD
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    file: process.env.LOG_FILE || 'logs/accounting.log'
  }
};
