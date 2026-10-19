import sql from 'mssql/msnodesqlv8.js';

const pool = new sql.ConnectionPool({
  server: process.env.DB_HOST || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'youtube_xu',
  driver: 'ODBC Driver 18 for SQL Server',
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
});

const identityColumns = {
  ad_views: 'view_id',
  ads: 'ad_id',
  redemptions: 'redemption_id',
  rewards: 'reward_id',
  users: 'user_id',
  xu_transactions: 'txn_id'
};

function prepareQuery(sqlText, params) {
  const placeholders = sqlText.match(/\?/g) || [];
  if (placeholders.length !== params.length) {
    throw new Error(`Expected ${placeholders.length} SQL parameters, received ${params.length}.`);
  }

  let parameterIndex = 0;
  let preparedSql = sqlText.replace(/\?/g, () => `@param${parameterIndex++}`);
  preparedSql = preparedSql.replace(/\s+FOR UPDATE\b/gi, '').replace(/\bNOW\(\)/gi, 'GETDATE()');
  const limitMatch = preparedSql.match(/\bLIMIT\s+(\d+)\s*;?\s*$/i);
  if (limitMatch) {
    preparedSql = preparedSql.replace(limitMatch[0], '');
    preparedSql = preparedSql.replace(/^(\s*SELECT\s+)(DISTINCT\s+)?/i, (_, select, distinct = '') =>
      `${select}${distinct}TOP (${limitMatch[1]}) `
    );
  }

  const insertMatch = preparedSql.match(/\bINSERT\s+INTO\s+([\w.[\]]+)\s*\([^)]*\)\s+VALUES\b/i);
  if (insertMatch) {
    const tableName = insertMatch[1].split(/[.[\]]/).pop().toLowerCase();
    const identityColumn = identityColumns[tableName];
    if (identityColumn) {
      const insertEnd = insertMatch[0].lastIndexOf('VALUES');
      const insertHeaderEnd = insertMatch.index + insertEnd;
      preparedSql = `${preparedSql.slice(0, insertHeaderEnd)}OUTPUT INSERTED.${identityColumn} AS insertId ${preparedSql.slice(insertHeaderEnd)}`;
    }
  }

  return preparedSql;
}

async function execute(request, sqlText, params) {
  const preparedSql = prepareQuery(sqlText, params);
  params.forEach((value, index) => request.input(`param${index}`, value));
  const result = await request.query(preparedSql);
  const insertId = result.recordset?.[0]?.insertId;
  return { rows: result.recordset || [], insertId };
}

export async function query(sqlText, params = []) {
  try {
    await pool.connect();
    const result = await execute(pool.request(), sqlText, params);
    return result.insertId === undefined
      ? result.rows
      : { insertId: result.insertId, affectedRows: result.rows.length };
  } catch (error) {
    console.error('SQL Server Query Error:', error.message, 'SQL:', sqlText);
    throw error;
  }
}

const connection = {
  async getConnection() {
    await pool.connect();

    const transaction = new sql.Transaction(pool);
    let transactionActive = false;

    return {
      async beginTransaction() {
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionActive = true;
      },
      async execute(sqlText, params = []) {
        const result = await execute(new sql.Request(transaction), sqlText, params);
        return [result.insertId === undefined ? result.rows : { insertId: result.insertId }, []];
      },
      async commit() {
        await transaction.commit();
        transactionActive = false;
      },
      async rollback() {
        if (transactionActive) {
          await transaction.rollback();
          transactionActive = false;
        }
      },
      release() {
        if (transactionActive) {
          this.rollback().catch((error) => console.error('SQL Server rollback error:', error));
        }
      }
    };
  }
};

export default connection;
