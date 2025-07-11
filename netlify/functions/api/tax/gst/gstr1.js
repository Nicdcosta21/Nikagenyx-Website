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

// Get or save GSTR-1 data
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
        const queryParams = event.queryStringParameters || {};
        
        if (queryParams.id) {
          // Get existing GSTR-1 by ID
          const gstr1Result = await client.query(`
            SELECT id, period, data, status, created_at, updated_at
            FROM gst_returns
            WHERE id = $1 AND type = '1'
          `, [queryParams.id]);
          
          if (gstr1Result.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'GSTR-1 not found' })
            };
          }
          
          const gstr1 = gstr1Result.rows[0];
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              id: gstr1.id,
              period: gstr1.period,
              ...gstr1.data,
              status: gstr1.status,
              createdAt: gstr1.created_at,
              updatedAt: gstr1.updated_at
            })
          };
        } else if (queryParams.generate === 'true' || event.path.includes('/generate')) {
          // Generate new GSTR-1 based on date range
          const startDate = queryParams.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1, 1)).toISOString().split('T')[0];
          const endDate = queryParams.endDate || new Date(new Date().setDate(0)).toISOString().split('T')[0]; // Last day of previous month
          
          // Get GST settings for GSTIN
          const settingsResult = await client.query(`
            SELECT value FROM settings WHERE key = 'gst.gstin'
          `);
          
          const gstin = settingsResult.rows.length > 0 ? settingsResult.rows[0].value : '';
          
          // Get B2B invoices (sales to registered businesses with GSTIN)
          const b2bResult = await client.query(`
            SELECT 
              i.invoice_number as "invoiceNumber",
              i.date as "invoiceDate",
              i.total as "invoiceValue",
              COALESCE(i.party_gstin, '') as gstin,
              '29' as "placeOfSupply", -- Default to Karnataka, would be determined by address in real implementation
              CASE
                WHEN ii.tax_rate IS NOT NULL THEN ii.tax_rate
                ELSE 18 -- Default rate
              END as "taxRate",
              SUM(ii.amount - ii.tax_amount) as "taxableValue",
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' THEN 0 -- Same state
                  ELSE ii.tax_amount 
                END
              ) as igst,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as cgst,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as sgst
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
              AND i.party_gstin IS NOT NULL
              AND i.party_gstin != ''
            GROUP BY
              i.invoice_number, i.date, i.total, i.party_gstin, ii.tax_rate
            ORDER BY
              i.date
          `, [startDate, endDate]);
          
          // Get B2C invoices (sales to consumers or unregistered businesses)
          const b2cResult = await client.query(`
            SELECT 
              i.invoice_number as "invoiceNumber",
              i.date as "invoiceDate",
              i.total as "invoiceValue",
              '29' as "placeOfSupply", -- Default to Karnataka
              CASE
                WHEN ii.tax_rate IS NOT NULL THEN ii.tax_rate
                ELSE 18 -- Default rate
              END as "taxRate",
              SUM(ii.amount - ii.tax_amount) as "taxableValue",
              SUM(
                CASE 
                  WHEN i.party_address LIKE '%Karnataka%' OR i.party_address LIKE '%KA%' THEN 0
                  ELSE ii.tax_amount 
                END
              ) as igst,
              SUM(
                CASE 
                  WHEN i.party_address LIKE '%Karnataka%' OR i.party_address LIKE '%KA%' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as cgst,
              SUM(
                CASE 
                  WHEN i.party_address LIKE '%Karnataka%' OR i.party_address LIKE '%KA%' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as sgst
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
              AND (i.party_gstin IS NULL OR i.party_gstin = '')
            GROUP BY
              i.invoice_number, i.date, i.total, i.party_address, ii.tax_rate
            ORDER BY
              i.date
          `, [startDate, endDate]);
          
          // Get HSN summary
          const hsnResult = await client.query(`
            WITH hsn_data AS (
              SELECT 
                COALESCE(products.hsn_code, '9999') as "hsnCode",
                COALESCE(products.name, ii.description) as description,
                COALESCE(products.uqc, 'NOS') as uqc,
                SUM(ii.quantity) as "totalQuantity",
                SUM(ii.amount) as "totalValue",
                SUM(ii.amount - ii.tax_amount) as "taxableValue",
                SUM(
                  CASE 
                    WHEN COALESCE(i.party_gstin, '') LIKE '29%' OR i.party_gstin IS NULL THEN 0
                    ELSE ii.tax_amount 
                  END
                ) as igst,
                SUM(
                  CASE 
                    WHEN COALESCE(i.party_gstin, '') LIKE '29%' OR i.party_gstin IS NULL THEN ii.tax_amount / 2
                    ELSE 0 
                  END
                ) as cgst,
                SUM(
                  CASE 
                    WHEN COALESCE(i.party_gstin, '') LIKE '29%' OR i.party_gstin IS NULL THEN ii.tax_amount / 2
                    ELSE 0 
                  END
                ) as sgst
              FROM 
                invoices i
              JOIN
                invoice_items ii ON i.id = ii.invoice_id
              LEFT JOIN
                products ON ii.product_id = products.id
              WHERE 
                i.date BETWEEN $1 AND $2
                AND i.invoice_type = 'sale'
                AND i.status != 'voided'
              GROUP BY
                products.hsn_code, products.name, ii.description, products.uqc
            )
            SELECT * FROM hsn_data
            ORDER BY "hsnCode"
          `, [startDate, endDate]);
          
          // Format the period string
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          const period = `${startDate} to ${endDate}`;
          
          // Format the return data
          const gstr1Data = {
            period: period,
            b2b: b2bResult.rows,
            b2c: b2cResult.rows,
            hsn: hsnResult.rows
          };
          
          // Get due date (11th of the next month)
          const dueDate = new Date(endDateObj);
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(11);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ...gstr1Data,
              dueDate: dueDate.toISOString().split('T')[0]
            })
          };
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing parameters. Provide id or generate=true' })
          };
        }
      } else if (event.httpMethod === 'POST') {
        // Save GSTR-1 data
        const data = JSON.parse(event.body);
        const { id, period, b2b, b2c, hsn } = data;
        
        if (!period) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Period is required' })
          };
        }
        
        // Calculate due date (11th of the next month from end date)
        const periodParts = period.split(' to ');
        const endDateStr = periodParts[1];
        const endDate = new Date(endDateStr);
        const dueDate = new Date(endDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(11);
        
        // Start transaction
        await client.query('BEGIN');
        
        try {
          if (id) {
            // Update existing GSTR-1
            await client.query(`
              UPDATE gst_returns
              SET 
                data = $1,
                updated_at = NOW(),
                updated_by = $2
              WHERE id = $3 AND type = '1'
            `, [
              { b2b, b2c, hsn },
              user.sub,
              id
            ]);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                id,
                message: 'GSTR-1 updated successfully'
              })
            };
          } else {
            // Create new GSTR-1
            const result = await client.query(`
              INSERT INTO gst_returns (
                id,
                type,
                period,
                data,
                status,
                due_date,
                created_by,
                created_at,
                updated_at
              ) VALUES (
                uuid_generate_v4(),
                '1',
                $1,
                $2,
                'pending',
                $3,
                $4,
                NOW(),
                NOW()
              ) RETURNING id
            `, [
              period,
              { b2b, b2c, hsn },
              dueDate.toISOString(),
              user.sub
            ]);
            
            const newId = result.rows[0].id;
            
            await client.query('COMMIT');
            
            return {
              statusCode: 201,
              headers,
              body: JSON.stringify({
                id: newId,
                message: 'GSTR-1 created successfully'
              })
            };
          }
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
    console.error('Error handling GSTR-1:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
