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

// Get or update tax settings
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      if (event.httpMethod === 'GET') {
        // Get existing settings
        const settingsResult = await client.query(`
          SELECT key, value FROM settings WHERE category IN ('gst', 'tds')
        `);
        
        // Default settings
        const defaultSettings = {
          gst: {
            gstin: '',
            registrationType: 'Regular',
            filingFrequency: 'Monthly',
            defaultTaxRate: 18,
            emailReminders: true,
            autoGenerate: true
          },
          tds: {
            panNo: '',
            tanNo: '',
            deductorType: 'Company',
            defaultRates: {
              '194A': 10,
              '194C': 2,
              '194H': 5,
              '194I': 10,
              '194J': 10
            },
            emailReminders: true
          }
        };
        
        // Process results into a structured object
        const settings = settingsResult.rows.reduce((acc, { key, value }) => {
          // Extract category and specific key
          const [category, specificKey] = key.split('.');
          
          if (!acc[category]) {
            acc[category] = {};
          }
          
          // Handle nested defaultRates object for TDS
          if (specificKey.startsWith('defaultRates.')) {
            const rateKey = specificKey.split('.')[1];
            if (!acc[category].defaultRates) {
              acc[category].defaultRates = {};
            }
            
            acc[category].defaultRates[rateKey] = parseFloat(value);
          } else {
            // Convert 'true'/'false' strings to actual booleans
            if (value === 'true') {
              acc[category][specificKey] = true;
            } else if (value === 'false') {
              acc[category][specificKey] = false;
            } else if (!isNaN(value)) {
              acc[category][specificKey] = parseFloat(value);
            } else {
              acc[category][specificKey] = value;
            }
          }
          
          return acc;
        }, { gst: {}, tds: {} });
        
        // Merge with default settings to ensure all fields exist
        const mergedSettings = {
          gst: { ...defaultSettings.gst, ...settings.gst },
          tds: { 
            ...defaultSettings.tds,
            ...settings.tds,
            defaultRates: { 
              ...defaultSettings.tds.defaultRates,
              ...(settings.tds.defaultRates || {})
            }
          }
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(mergedSettings)
        };
      } else if (event.httpMethod === 'POST') {
        // Update settings
        const settings = JSON.parse(event.body);
        
        // Start transaction
        await client.query('BEGIN');
        
        try {
          // Update GST settings
          for (const [key, value] of Object.entries(settings.gst)) {
            await client.query(`
              INSERT INTO settings (key, value, category, updated_by, updated_at) 
              VALUES ($1, $2, 'gst', $3, NOW())
              ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
            `, [`gst.${key}`, value.toString(), user.sub]);
          }
          
          // Update TDS settings
          for (const [key, value] of Object.entries(settings.tds)) {
            if (key === 'defaultRates') {
              // Handle nested defaultRates object
              for (const [rateKey, rateValue] of Object.entries(value)) {
                await client.query(`
                  INSERT INTO settings (key, value, category, updated_by, updated_at) 
                  VALUES ($1, $2, 'tds', $3, NOW())
                  ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
                `, [`tds.defaultRates.${rateKey}`, rateValue.toString(), user.sub]);
              }
            } else {
              await client.query(`
                INSERT INTO settings (key, value, category, updated_by, updated_at) 
                VALUES ($1, $2, 'tds', $3, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
              `, [`tds.${key}`, value.toString(), user.sub]);
            }
          }
          
          await client.query('COMMIT');
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Settings updated successfully' })
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling tax settings:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
