const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to verify JWT token
const verifyToken = (authHeader) => {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Bearer token is missing');
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Get or update invoice settings
exports.handler = async (event, context) => {
  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      return await getSettings();
    } else if (event.httpMethod === 'POST') {
      return await updateSettings(event, user);
    } else {
      return { 
        statusCode: 405, 
        body: 'Method Not Allowed' 
      };
    }
  } catch (error) {
    console.error('Error handling invoice settings:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Get settings
async function getSettings() {
  const client = await pool.connect();
  
  try {
    // Fetch settings from the database
    const result = await client.query(`
      SELECT key, value FROM settings
      WHERE category = 'invoice'
    `);
    
    // Convert array of key-value pairs to a single object
    const settings = result.rows.reduce((obj, row) => {
      obj[toCamelCase(row.key)] = row.value;
      return obj;
    }, {
      // Default values if not found in database
      companyName: 'Nikagenyx',
      companyGstin: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
      companyLogo: '',
      bankName: '',
      bankAccountNumber: '',
      bankIfsc: '',
      termsAndConditions: 'Payment is due within 30 days.',
      invoicePrefix: 'INV-',
      purchasePrefix: 'PUR-',
      nextInvoiceNumber: '1',
      nextPurchaseNumber: '1',
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    };
  } finally {
    client.release();
  }
}

// Update settings
async function updateSettings(event, user) {
  const settings = JSON.parse(event.body);
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // For each setting in the request, update or insert
    for (const [key, value] of Object.entries(settings)) {
      const snakeCaseKey = toSnakeCase(key);
      
      // Skip if key is not valid
      if (!isValidSettingKey(snakeCaseKey)) continue;
      
      // Upsert the setting
      await client.query(`
        INSERT INTO settings (key, value, category, updated_by, updated_at)
        VALUES ($1, $2, 'invoice', $3, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $2, updated_by = $3, updated_at = NOW()
      `, [snakeCaseKey, value.toString(), user.sub]);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Settings updated successfully'
      })
    };
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to convert snake_case to camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, group) => group.toUpperCase());
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Validate if the setting key is allowed
function isValidSettingKey(key) {
  const allowedKeys = [
    'company_name',
    'company_gstin',
    'company_address',
    'company_email',
    'company_phone',
    'company_logo',
    'bank_name',
    'bank_account_number',
    'bank_ifsc',
    'terms_and_conditions',
    'invoice_prefix',
    'purchase_prefix',
    'next_invoice_number',
    'next_purchase_number',
  ];
  
  return allowedKeys.includes(key);
}
