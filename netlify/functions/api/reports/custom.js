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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      const pathParts = event.path.split('/');
      const action = pathParts[pathParts.length - 1];
      
      switch (event.httpMethod) {
        case 'GET':
          if (action === 'build') {
            // Build a custom report based on configuration
            const config = JSON.parse(event.queryStringParameters.config);
            
            // Execute the custom report query
            const queryResult = await executeCustomReport(client, config);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(queryResult)
            };
          } else if (action.match(/^[0-9a-f-]{36}$/)) {
            // Get a specific custom report
            const reportId = action;
            
            const result = await client.query(`
              SELECT *
              FROM custom_reports
              WHERE id = $1 AND created_by = $2
            `, [reportId, user.sub]);
            
            if (result.rows.length === 0) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Report not found' })
              };
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows[0])
            };
          } else {
            // Get all custom reports
            const result = await client.query(`
              SELECT *
              FROM custom_reports
              WHERE created_by = $1
              ORDER BY created_at DESC
            `, [user.sub]);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(result.rows)
            };
          }
          
        case 'POST':
          // Create a new custom report
          const data = JSON.parse(event.body);
          
          const result = await client.query(`
            INSERT INTO custom_reports (
              title,
              description,
              config,
              created_by
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `, [
            data.title,
            data.description,
            data.config,
            user.sub
          ]);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result.rows[0])
          };
          
        case 'PUT':
          // Update an existing custom report
          if (!action.match(/^[0-9a-f-]{36}$/)) {
            throw new Error('Invalid report ID');
          }
          
          const updateData = JSON.parse(event.body);
          
          const updateResult = await client.query(`
            UPDATE custom_reports
            SET 
              title = $1,
              description = $2,
              config = $3,
              updated_by = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $5 AND created_by = $6
            RETURNING *
          `, [
            updateData.title,
            updateData.description,
            updateData.config,
            user.sub,
            action,
            user.sub
          ]);
          
          if (updateResult.rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Report not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updateResult.rows[0])
          };
          
        case 'DELETE':
          // Delete a custom report
          if (!action.match(/^[0-9a-f-]{36}$/)) {
            throw new Error('Invalid report ID');
          }
          
          await client.query(`
            DELETE FROM custom_reports
            WHERE id = $1 AND created_by = $2
          `, [action, user.sub]);
          
          return {
            statusCode: 204,
            headers,
            body: ''
          };
          
        default:
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
    console.error('Error handling custom report request:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper function to execute custom report queries
async function executeCustomReport(client, config) {
  // Start building the query
  let query = 'SELECT ';
  const params = [];
  let paramIndex = 1;
  
  // Add selected columns
  const columns = [];
  if (config.columns.includes('account')) {
    columns.push('a.name as account_name');
  }
  if (config.columns.includes('type')) {
    columns.push('a.type as account_type');
  }
  if (config.columns.includes('current')) {
    columns.push(`
      SUM(CASE 
        WHEN t.type = a.normal_balance THEN t.amount 
        ELSE -t.amount 
      END) as current_balance
    `);
  }
  if (config.columns.includes('ytd')) {
    columns.push(`
      SUM(CASE 
        WHEN t.type = a.normal_balance 
          AND t.date >= date_trunc('year', $${paramIndex}::date)
        THEN t.amount 
        WHEN t.type != a.normal_balance 
          AND t.date >= date_trunc('year', $${paramIndex}::date)
        THEN -t.amount 
        ELSE 0
      END) as ytd_balance
    `);
    params.push(config.dateRange.end);
    paramIndex++;
  }
  
  query += columns.join(', ');
  
  // Add from clause
  query += `
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
  `;
  
  // Add where clause
  const conditions = [];
  
  if (config.dateRange.start && config.dateRange.end) {
    conditions.push(`(t.date IS NULL OR t.date BETWEEN $${paramIndex} AND $${paramIndex + 1})`);
    params.push(config.dateRange.start, config.dateRange.end);
    paramIndex += 2;
  }
  
  if (config.filters.accountTypes && config.filters.accountTypes.length > 0) {
    conditions.push(`a.type = ANY($${paramIndex})`);
    params.push(config.filters.accountTypes);
    paramIndex++;
  }
  
  if (config.filters.accounts && config.filters.accounts.length > 0) {
    conditions.push(`a.id = ANY($${paramIndex})`);
    params.push(config.filters.accounts);
    paramIndex++;
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add group by
  const groupBy = [];
  if (config.columns.includes('account')) {
    groupBy.push('a.name');
  }
  if (config.columns.includes('type')) {
    groupBy.push('a.type');
  }
  
  if (groupBy.length > 0) {
    query += ' GROUP BY ' + groupBy.join(', ');
  }
  
  // Add having clause for amount filters
  const having = [];
  if (config.filters.minAmount) {
    having.push(`SUM(CASE WHEN t.type = a.normal_balance THEN t.amount ELSE -t.amount END) >= $${paramIndex}`);
    params.push(parseFloat(config.filters.minAmount));
    paramIndex++;
  }
  if (config.filters.maxAmount) {
    having.push(`SUM(CASE WHEN t.type = a.normal_balance THEN t.amount ELSE -t.amount END) <= $${paramIndex}`);
    params.push(parseFloat(config.filters.maxAmount));
    paramIndex++;
  }
  
  if (having.length > 0) {
    query += ' HAVING ' + having.join(' AND ');
  }
  
  // Add order by
  if (config.sortBy && config.sortDirection) {
    const sortColumn = 
      config.sortBy === 'account' ? 'a.name' :
      config.sortBy === 'type' ? 'a.type' :
      config.sortBy === 'current' ? 'current_balance' :
      config.sortBy === 'ytd' ? 'ytd_balance' :
      'a.name';
    
    query += ` ORDER BY ${sortColumn} ${config.sortDirection.toUpperCase()}`;
  }
  
  // Execute the query
  const result = await client.query(query, params);
  
  return {
    rows: result.rows,
    totals: {
      currentBalance: result.rows.reduce((sum, row) => sum + (parseFloat(row.current_balance) || 0), 0),
      ytdBalance: result.rows.reduce((sum, row) => sum + (parseFloat(row.ytd_balance) || 0), 0)
    }
  };
}
