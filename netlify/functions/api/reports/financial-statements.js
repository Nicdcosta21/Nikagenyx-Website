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

// Helper function to calculate YTD totals
const calculateYTD = (transactions, startDate, endDate) => {
  return transactions.reduce((total, transaction) => {
    const transactionDate = new Date(transaction.date);
    if (transactionDate >= startDate && transactionDate <= endDate) {
      return total + (transaction.amount || 0);
    }
    return total;
  }, 0);
};

// Helper function to calculate account balances
const calculateBalances = async (client, asOfDate, compareDate = null) => {
  // Get all accounts
  const accountsResult = await client.query(`
    SELECT 
      id, 
      name, 
      type, 
      parent_id,
      normal_balance
    FROM accounts
    ORDER BY name
  `);

  // Get all transactions up to the specified date
  const transactionsResult = await client.query(`
    SELECT 
      account_id,
      amount,
      type,
      date
    FROM transactions
    WHERE date <= $1
    ORDER BY date
  `, [asOfDate]);

  // If comparative mode, get transactions for compare date
  let compareTransactions = [];
  if (compareDate) {
    const compareResult = await client.query(`
      SELECT 
        account_id,
        amount,
        type,
        date
      FROM transactions
      WHERE date <= $1
      ORDER BY date
    `, [compareDate]);
    compareTransactions = compareResult.rows;
  }

  // Calculate balances for each account
  const balances = accountsResult.rows.map(account => {
    const accountTransactions = transactionsResult.rows.filter(t => t.account_id === account.id);
    const balance = accountTransactions.reduce((total, transaction) => {
      const multiplier = transaction.type === account.normal_balance ? 1 : -1;
      return total + (transaction.amount * multiplier);
    }, 0);

    let compareBalance = null;
    if (compareDate) {
      const accountCompareTransactions = compareTransactions.filter(t => t.account_id === account.id);
      compareBalance = accountCompareTransactions.reduce((total, transaction) => {
        const multiplier = transaction.type === account.normal_balance ? 1 : -1;
        return total + (transaction.amount * multiplier);
      }, 0);
    }

    return {
      ...account,
      balance,
      compareBalance
    };
  });

  return balances;
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Verify token
    const user = verifyToken(event.headers.authorization);

    // Get parameters from query string
    const params = new URLSearchParams(event.queryStringParameters || {});
    const reportType = event.path.split('/').pop(); // 'balance-sheet', 'profit-loss', or 'cash-flow'
    const asOfDate = params.get('asOfDate') || new Date().toISOString().split('T')[0];
    const compareDate = params.get('compareDate');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');

    // Connect to database
    const client = await pool.connect();

    try {
      switch (reportType) {
        case 'balance-sheet':
          // Calculate account balances as of the specified date
          const balances = await calculateBalances(client, asOfDate, compareDate);

          // Group accounts by type
          const assets = balances.filter(account => account.type === 'asset');
          const liabilities = balances.filter(account => account.type === 'liability');
          const equity = balances.filter(account => account.type === 'equity');

          // Calculate totals
          const totalAssets = assets.reduce((sum, account) => sum + account.balance, 0);
          const totalLiabilities = liabilities.reduce((sum, account) => sum + account.balance, 0);
          const totalEquity = equity.reduce((sum, account) => sum + account.balance, 0);

          // Calculate comparative totals if needed
          const compareTotals = compareDate ? {
            assets: assets.reduce((sum, account) => sum + (account.compareBalance || 0), 0),
            liabilities: liabilities.reduce((sum, account) => sum + (account.compareBalance || 0), 0),
            equity: equity.reduce((sum, account) => sum + (account.compareBalance || 0), 0)
          } : null;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              asOfDate,
              compareDate,
              assets,
              liabilities,
              equity,
              totalAssets,
              totalLiabilities,
              totalEquity,
              compareTotals
            })
          };

        case 'profit-loss':
          // Get transactions for the period
          const plTransactions = await client.query(`
            SELECT 
              t.account_id,
              t.amount,
              t.type,
              t.date,
              a.name as account_name,
              a.type as account_type,
              a.normal_balance
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.date BETWEEN $1 AND $2
              AND a.type IN ('income', 'expense')
            ORDER BY t.date
          `, [startDate, endDate]);

          // Get comparative transactions if needed
          let compareTransactions = [];
          if (compareDate) {
            const compareResult = await client.query(`
              SELECT 
                t.account_id,
                t.amount,
                t.type,
                t.date,
                a.name as account_name,
                a.type as account_type,
                a.normal_balance
              FROM transactions t
              JOIN accounts a ON t.account_id = a.id
              WHERE t.date BETWEEN $1 AND $2
                AND a.type IN ('income', 'expense')
              ORDER BY t.date
            `, [params.get('compareStartDate'), params.get('compareEndDate')]);
            compareTransactions = compareResult.rows;
          }

          // Calculate income and expenses
          const income = plTransactions.rows
            .filter(t => t.account_type === 'income')
            .reduce((accounts, t) => {
              const accountIndex = accounts.findIndex(a => a.id === t.account_id);
              const amount = t.type === t.normal_balance ? t.amount : -t.amount;
              
              if (accountIndex === -1) {
                accounts.push({
                  id: t.account_id,
                  name: t.account_name,
                  amount,
                  compareAmount: 0
                });
              } else {
                accounts[accountIndex].amount += amount;
              }
              
              return accounts;
            }, []);

          const expenses = plTransactions.rows
            .filter(t => t.account_type === 'expense')
            .reduce((accounts, t) => {
              const accountIndex = accounts.findIndex(a => a.id === t.account_id);
              const amount = t.type === t.normal_balance ? t.amount : -t.amount;
              
              if (accountIndex === -1) {
                accounts.push({
                  id: t.account_id,
                  name: t.account_name,
                  amount,
                  compareAmount: 0
                });
              } else {
                accounts[accountIndex].amount += amount;
              }
              
              return accounts;
            }, []);

          // Calculate comparative amounts if needed
          if (compareTransactions.length > 0) {
            compareTransactions
              .filter(t => t.account_type === 'income')
              .forEach(t => {
                const account = income.find(a => a.id === t.account_id);
                if (account) {
                  account.compareAmount += t.type === t.normal_balance ? t.amount : -t.amount;
                }
              });

            compareTransactions
              .filter(t => t.account_type === 'expense')
              .forEach(t => {
                const account = expenses.find(a => a.id === t.account_id);
                if (account) {
                  account.compareAmount += t.type === t.normal_balance ? t.amount : -t.amount;
                }
              });
          }

          // Calculate totals
          const totalIncome = income.reduce((sum, account) => sum + account.amount, 0);
          const totalExpenses = expenses.reduce((sum, account) => sum + account.amount, 0);
          const netIncome = totalIncome - totalExpenses;

          // Calculate comparative totals if needed
          const compareTotalsP_L = compareTransactions.length > 0 ? {
            income: income.reduce((sum, account) => sum + account.compareAmount, 0),
            expenses: expenses.reduce((sum, account) => sum + account.compareAmount, 0),
            netIncome: income.reduce((sum, account) => sum + account.compareAmount, 0) -
                      expenses.reduce((sum, account) => sum + account.compareAmount, 0)
          } : null;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              startDate,
              endDate,
              compareStartDate: params.get('compareStartDate'),
              compareEndDate: params.get('compareEndDate'),
              income,
              expenses,
              totalIncome,
              totalExpenses,
              netIncome,
              compareTotals: compareTotalsP_L
            })
          };

        case 'cash-flow':
          // Get cash transactions for the period
          const cashTransactions = await client.query(`
            SELECT 
              t.id,
              t.account_id,
              t.amount,
              t.type,
              t.date,
              a.name as account_name,
              a.type as account_type,
              a.normal_balance
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.date BETWEEN $1 AND $2
            ORDER BY t.date
          `, [startDate, endDate]);

          // Get comparative transactions if needed
          let compareCashTransactions = [];
          if (compareDate) {
            const compareResult = await client.query(`
              SELECT 
                t.id,
                t.account_id,
                t.amount,
                t.type,
                t.date,
                a.name as account_name,
                a.type as account_type,
                a.normal_balance
              FROM transactions t
              JOIN accounts a ON t.account_id = a.id
              WHERE t.date BETWEEN $1 AND $2
              ORDER BY t.date
            `, [params.get('compareStartDate'), params.get('compareEndDate')]);
            compareCashTransactions = compareResult.rows;
          }

          // Calculate cash flows by category
          const operatingActivities = [];
          const investingActivities = [];
          const financingActivities = [];

          // Helper function to categorize transactions
          const categorizeTransaction = (transaction) => {
            const amount = transaction.type === transaction.normal_balance ? 
              transaction.amount : -transaction.amount;

            switch (transaction.account_type) {
              case 'income':
              case 'expense':
              case 'accounts_receivable':
              case 'accounts_payable':
                operatingActivities.push({
                  description: transaction.account_name,
                  amount
                });
                break;
              
              case 'fixed_asset':
              case 'investment':
                investingActivities.push({
                  description: transaction.account_name,
                  amount
                });
                break;
              
              case 'loan':
              case 'equity':
                financingActivities.push({
                  description: transaction.account_name,
                  amount
                });
                break;
            }
          };

          // Categorize current period transactions
          cashTransactions.rows.forEach(categorizeTransaction);

          // Calculate totals
          const netOperatingCash = operatingActivities.reduce((sum, activity) => sum + activity.amount, 0);
          const netInvestingCash = investingActivities.reduce((sum, activity) => sum + activity.amount, 0);
          const netFinancingCash = financingActivities.reduce((sum, activity) => sum + activity.amount, 0);
          const netCashChange = netOperatingCash + netInvestingCash + netFinancingCash;

          // Calculate comparative totals if needed
          let compareOperatingCash = 0;
          let compareInvestingCash = 0;
          let compareFinancingCash = 0;

          if (compareCashTransactions.length > 0) {
            const compareOperating = [];
            const compareInvesting = [];
            const compareFinancing = [];

            compareCashTransactions.forEach(transaction => {
              const amount = transaction.type === transaction.normal_balance ? 
                transaction.amount : -transaction.amount;

              switch (transaction.account_type) {
                case 'income':
                case 'expense':
                case 'accounts_receivable':
                case 'accounts_payable':
                  compareOperating.push({ amount });
                  break;
                
                case 'fixed_asset':
                case 'investment':
                  compareInvesting.push({ amount });
                  break;
                
                case 'loan':
                case 'equity':
                  compareFinancing.push({ amount });
                  break;
              }
            });

            compareOperatingCash = compareOperating.reduce((sum, activity) => sum + activity.amount, 0);
            compareInvestingCash = compareInvesting.reduce((sum, activity) => sum + activity.amount, 0);
            compareFinancingCash = compareFinancing.reduce((sum, activity) => sum + activity.amount, 0);
          }

          // Get opening and closing balances
          const openingBalanceResult = await client.query(`
            SELECT SUM(
              CASE 
                WHEN t.type = a.normal_balance THEN t.amount 
                ELSE -t.amount 
              END
            ) as balance
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.type = 'cash'
              AND t.date < $1
          `, [startDate]);

          const closingBalanceResult = await client.query(`
            SELECT SUM(
              CASE 
                WHEN t.type = a.normal_balance THEN t.amount 
                ELSE -t.amount 
              END
            ) as balance
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.type = 'cash'
              AND t.date <= $1
          `, [endDate]);

          const openingBalance = openingBalanceResult.rows[0].balance || 0;
          const closingBalance = closingBalanceResult.rows[0].balance || 0;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              startDate,
              endDate,
              compareStartDate: params.get('compareStartDate'),
              compareEndDate: params.get('compareEndDate'),
              openingBalance,
              operatingActivities,
              investingActivities,
              financingActivities,
              netOperatingCash,
              netInvestingCash,
              netFinancingCash,
              netCashChange,
              closingBalance,
              compareOperatingCash,
              compareInvestingCash,
              compareFinancingCash
            })
          };

        default:
          throw new Error('Invalid report type');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating financial statement:', error);
    
    return {
      statusCode: error.message.includes('token') ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
