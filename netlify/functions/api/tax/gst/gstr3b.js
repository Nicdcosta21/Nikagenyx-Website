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

// Get or save GSTR-3B data
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
          // Get existing GSTR-3B by ID
          const gstr3bResult = await client.query(`
            SELECT id, period, data, status, created_at, updated_at
            FROM gst_returns
            WHERE id = $1 AND type = '3B'
          `, [queryParams.id]);
          
          if (gstr3bResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'GSTR-3B not found' })
            };
          }
          
          const gstr3b = gstr3bResult.rows[0];
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              id: gstr3b.id,
              period: gstr3b.period,
              ...gstr3b.data,
              status: gstr3b.status,
              createdAt: gstr3b.created_at,
              updatedAt: gstr3b.updated_at
            })
          };
        } else if (queryParams.generate === 'true' || event.path.includes('/generate')) {
          // Generate new GSTR-3B based on date range
          const startDate = queryParams.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1, 1)).toISOString().split('T')[0];
          const endDate = queryParams.endDate || new Date(new Date().setDate(0)).toISOString().split('T')[0]; // Last day of previous month
          
          // Get GST settings for GSTIN
          const settingsResult = await client.query(`
            SELECT value FROM settings WHERE key = 'gst.gstin'
          `);
          
          const gstin = settingsResult.rows.length > 0 ? settingsResult.rows[0].value : '';
          
          // 1. Get outward supplies (sales)
          const outwardResult = await client.query(`
            SELECT 
              SUM(ii.amount - ii.tax_amount) as taxable,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' AND i.party_gstin IS NOT NULL AND i.party_gstin != '' THEN ii.tax_amount 
                  ELSE 0 
                END
              ) as igst,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' OR i.party_gstin IS NULL OR i.party_gstin = '' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as cgst,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' OR i.party_gstin IS NULL OR i.party_gstin = '' THEN ii.tax_amount / 2
                  ELSE 0 
                END
              ) as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
          `, [startDate, endDate]);
          
          // 2. Get zero-rated supplies (exports)
          const zeroRatedResult = await client.query(`
            SELECT 
              SUM(ii.amount) as taxable,
              0 as igst,
              0 as cgst,
              0 as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
              AND (i.notes LIKE '%export%' OR i.notes LIKE '%zero-rated%')
          `, [startDate, endDate]);
          
          // 3. Get nil-rated and exempted supplies
          const exemptedResult = await client.query(`
            SELECT 
              SUM(ii.amount) as taxable,
              0 as igst,
              0 as cgst,
              0 as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
              AND ii.tax_rate = 0
          `, [startDate, endDate]);
          
          // 4. Get reverse charge supplies
          const reverseChargeResult = await client.query(`
            SELECT 
              SUM(ii.amount - ii.tax_amount) as taxable,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.tax_amount 
                  ELSE 0 
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
              ) as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND (i.notes LIKE '%reverse charge%' OR i.notes LIKE '%rcm%')
          `, [startDate, endDate]);
          
          // 5. Get non-GST supplies
          const nonGstResult = await client.query(`
            SELECT 
              SUM(ii.amount) as taxable,
              0 as igst,
              0 as cgst,
              0 as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'sale'
              AND i.status != 'voided'
              AND (i.notes LIKE '%non-gst%' OR i.notes LIKE '%non gst%')
          `, [startDate, endDate]);
          
          // 6. Get inter-state supplies by state
          const interStateResult = await client.query(`
            SELECT 
              CASE
                WHEN i.party_gstin LIKE '01%' THEN 'Jammu and Kashmir'
                WHEN i.party_gstin LIKE '02%' THEN 'Himachal Pradesh'
                WHEN i.party_gstin LIKE '03%' THEN 'Punjab'
                WHEN i.party_gstin LIKE '04%' THEN 'Chandigarh'
                WHEN i.party_gstin LIKE '05%' THEN 'Uttarakhand'
                WHEN i.party_gstin LIKE '06%' THEN 'Haryana'
                WHEN i.party_gstin LIKE '07%' THEN 'Delhi'
                WHEN i.party_gstin LIKE '08%' THEN 'Rajasthan'
                WHEN i.party_gstin LIKE '09%' THEN 'Uttar Pradesh'
                WHEN i.party_gstin LIKE '10%' THEN 'Bihar'
                WHEN i.party_gstin LIKE '11%' THEN 'Sikkim'
                WHEN i.party_gstin LIKE '12%' THEN 'Arunachal Pradesh'
                WHEN i.party_gstin LIKE '13%' THEN 'Nagaland'
                WHEN i.party_gstin LIKE '14%' THEN 'Manipur'
                WHEN i.party_gstin LIKE '15%' THEN 'Mizoram'
                WHEN i.party_gstin LIKE '16%' THEN 'Tripura'
                WHEN i.party_gstin LIKE '17%' THEN 'Meghalaya'
                WHEN i.party_gstin LIKE '18%' THEN 'Assam'
                WHEN i.party_gstin LIKE '19%' THEN 'West Bengal'
                WHEN i.party_gstin LIKE '20%' THEN 'Jharkhand'
                WHEN i.party_gstin LIKE '21%' THEN 'Odisha'
                WHEN i.party_gstin LIKE '22%' THEN 'Chhattisgarh'
                WHEN i.party_gstin LIKE '23%' THEN 'Madhya Pradesh'
                WHEN i.party_gstin LIKE '24%' THEN 'Gujarat'
                -- Skip 29 Karnataka as it's not inter-state
                WHEN i.party_gstin LIKE '27%' THEN 'Maharashtra'
                WHEN i.party_gstin LIKE '28%' THEN 'Andhra Pradesh'
                WHEN i.party_gstin LIKE '29%' THEN 'Karnataka'
                WHEN i.party_gstin LIKE '30%' THEN 'Goa'
                WHEN i.party_gstin LIKE '31%' THEN 'Lakshadweep'
                WHEN i.party_gstin LIKE '32%' THEN 'Kerala'
                WHEN i.party_gstin LIKE '33%' THEN 'Tamil Nadu'
                WHEN i.party_gstin LIKE '34%' THEN 'Puducherry'
                WHEN i.party_gstin LIKE '35%' THEN 'Andaman and Nicobar Islands'
                WHEN i.party_gstin LIKE '36%' THEN 'Telangana'
                WHEN i.party_gstin LIKE '37%' THEN 'Andhra Pradesh (New)'
                WHEN i.party_gstin LIKE '38%' THEN 'Ladakh'
                ELSE 'Other'
              END as "placeOfSupply",
              SUM(ii.amount - ii.tax_amount) as taxable,
              SUM(ii.tax_amount) as igst
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
              AND i.party_gstin NOT LIKE '29%'  -- Not Karnataka
            GROUP BY
              "placeOfSupply"
            ORDER BY
              "placeOfSupply"
          `, [startDate, endDate]);
          
          // 7. Get ITC details (input tax credit)
          const itcAvailableResult = await client.query(`
            SELECT 
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.tax_amount 
                  ELSE 0 
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
              ) as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND i.notes NOT LIKE '%ineligible%'
          `, [startDate, endDate]);
          
          // 8. Get ITC reversed
          const itcReversedResult = await client.query(`
            SELECT 
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.tax_amount 
                  ELSE 0 
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
              ) as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND i.notes LIKE '%itc reversed%'
          `, [startDate, endDate]);
          
          // 9. Get ineligible ITC
          const itcIneligibleResult = await client.query(`
            SELECT 
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.tax_amount 
                  ELSE 0 
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
              ) as sgst,
              0 as cess
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND i.notes LIKE '%ineligible%'
          `, [startDate, endDate]);
          
          // 10. Get exempt, nil-rated and non-GST inward supplies
          const exemptedInwardResult = await client.query(`
            SELECT 
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.amount 
                  ELSE 0 
                END
              ) as interstate,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' THEN ii.amount
                  ELSE 0 
                END
              ) as intrastate
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND ii.tax_rate = 0
              AND (i.notes NOT LIKE '%non-gst%' AND i.notes NOT LIKE '%non gst%')
          `, [startDate, endDate]);
          
          // 11. Get non-GST inward supplies
          const nonGstInwardResult = await client.query(`
            SELECT 
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') NOT LIKE '29%' THEN ii.amount 
                  ELSE 0 
                END
              ) as interstate,
              SUM(
                CASE 
                  WHEN COALESCE(i.party_gstin, '') LIKE '29%' THEN ii.amount
                  ELSE 0 
                END
              ) as intrastate
            FROM 
              invoices i
            JOIN
              invoice_items ii ON i.id = ii.invoice_id
            WHERE 
              i.date BETWEEN $1 AND $2
              AND i.invoice_type = 'purchase'
              AND i.status != 'voided'
              AND (i.notes LIKE '%non-gst%' OR i.notes LIKE '%non gst%')
          `, [startDate, endDate]);
          
          // 12. Calculate payment details (Tax Payable)
          
          // Get output tax (collected)
          const outputTax = {
            igst: parseFloat(outwardResult.rows[0].igst) || 0,
            cgst: parseFloat(outwardResult.rows[0].cgst) || 0,
            sgst: parseFloat(outwardResult.rows[0].sgst) || 0,
            cess: parseFloat(outwardResult.rows[0].cess) || 0
          };
          
          // Get input tax (paid and eligible for credit)
          const inputTax = {
            igst: parseFloat(itcAvailableResult.rows[0].igst) - parseFloat(itcReversedResult.rows[0].igst) || 0,
            cgst: parseFloat(itcAvailableResult.rows[0].cgst) - parseFloat(itcReversedResult.rows[0].cgst) || 0,
            sgst: parseFloat(itcAvailableResult.rows[0].sgst) - parseFloat(itcReversedResult.rows[0].sgst) || 0,
            cess: parseFloat(itcAvailableResult.rows[0].cess) - parseFloat(itcReversedResult.rows[0].cess) || 0
          };
          
          // Calculate tax payable
          const taxPayable = {
            igst: Math.max(0, outputTax.igst - inputTax.igst),
            cgst: Math.max(0, outputTax.cgst - inputTax.cgst),
            sgst: Math.max(0, outputTax.sgst - inputTax.sgst),
            cess: Math.max(0, outputTax.cess - inputTax.cess)
          };
          
          // Set default values for any missing data
          const defaultValues = {
            taxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
            interstate: 0,
            intrastate: 0
          };
          
          // Format the period string
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          const period = `${startDate} to ${endDate}`;
          
          // Prepare the GSTR-3B data
          const gstr3bData = {
            period: period,
            outwardSupplies: outwardResult.rows[0] || defaultValues,
            zeroRated: zeroRatedResult.rows[0] || defaultValues,
            exempted: exemptedResult.rows[0] || defaultValues,
            reverseCharge: reverseChargeResult.rows[0] || defaultValues,
            nonGst: nonGstResult.rows[0] || defaultValues,
            interStateSupplies: interStateResult.rows,
            itc: {
              available: itcAvailableResult.rows[0] || defaultValues,
              reversed: itcReversedResult.rows[0] || defaultValues,
              ineligible: itcIneligibleResult.rows[0] || defaultValues
            },
            exemptedInward: exemptedInwardResult.rows[0] || defaultValues,
            nonGstInward: nonGstInwardResult.rows[0] || defaultValues,
            
            // Payment details
            taxPayable: taxPayable,
            taxAlreadyPaid: {
              igst: 0,
              cgst: 0,
              sgst: 0,
              cess: 0
            },
            itcUtilization: inputTax,
            taxPayableInCash: taxPayable,
            interest: {
              igst: 0,
              cgst: 0,
              sgst: 0,
              cess: 0
            },
            lateFee: {
              cgst: 0,
              sgst: 0
            },
            totalPayableInCash: taxPayable,
            verification: {
              name: '',
              designation: '',
              place: '',
              date: new Date().toISOString().split('T')[0],
              agreed: false
            }
          };
          
          // Get due date (20th of the next month)
          const dueDate = new Date(endDateObj);
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(20);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ...gstr3bData,
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
        // Save GSTR-3B data
        const data = JSON.parse(event.body);
        const { id, period } = data;
        
        if (!period) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Period is required' })
          };
        }
        
        // Calculate due date (20th of the next month from end date)
        const periodParts = period.split(' to ');
        const endDateStr = periodParts[1];
        const endDate = new Date(endDateStr);
        const dueDate = new Date(endDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(20);
        
        // Extract the data to save
        const saveData = {
          outwardSupplies: data.outwardSupplies,
          zeroRated: data.zeroRated,
          exempted: data.exempted,
          reverseCharge: data.reverseCharge,
          nonGst: data.nonGst,
          interStateSupplies: data.interStateSupplies,
          itc: data.itc,
          exemptedInward: data.exemptedInward,
          nonGstInward: data.nonGstInward,
          taxPayable: data.taxPayable,
          taxAlreadyPaid: data.taxAlreadyPaid,
          itcUtilization: data.itcUtilization,
          taxPayableInCash: data.taxPayableInCash,
          interest: data.interest,
          lateFee: data.lateFee,
          totalPayableInCash: data.totalPayableInCash,
          verification: data.verification
        };
        
        // Start transaction
        await client.query('BEGIN');
        
        try {
          if (id) {
            // Update existing GSTR-3B
            await client.query(`
              UPDATE gst_returns
              SET 
                data = $1,
                updated_at = NOW(),
                updated_by = $2
              WHERE id = $3 AND type = '3B'
            `, [
              saveData,
              user.sub,
              id
            ]);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                id,
                message: 'GSTR-3B updated successfully'
              })
            };
          } else {
            // Create new GSTR-3B
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
                '3B',
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
              saveData,
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
                message: 'GSTR-3B created successfully'
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
    console.error('Error handling GSTR-3B:', error);
    
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
