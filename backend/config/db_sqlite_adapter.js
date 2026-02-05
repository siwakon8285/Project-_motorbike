const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLitePool {
  constructor(config) {
    this.dbPath = config.connectionString || path.join(process.cwd(), 'database.sqlite');
    this.db = new sqlite3.Database(this.dbPath);
    this.initCustomFunctions();
  }

  initCustomFunctions() {
    // Implement json_agg polyfill for SQLite
  }

  connect() {
    return Promise.resolve(this);
  }

  on(event, callback) {
    if (event === 'connect') {
      callback();
    }
  }

  async query(text, params, callback) {
    // Normalize arguments
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    // Default params if not provided or undefined
    if (!params) {
        params = [];
    }

    // Promise wrapper to support both callback and promise
    const promise = new Promise((resolve, reject) => {
      let sql = text;
      const newParams = [];

      // Only perform parameter replacement if params are provided
      if (params && params.length > 0) {
          const paramRegex = /\$(\d+)/g;
          let paramMatch;
          
          const placeholders = [];
          while ((paramMatch = paramRegex.exec(text)) !== null) {
            placeholders.push({
              index: paramMatch.index,
              paramIndex: parseInt(paramMatch[1]) - 1 
            });
          }
          
          if (placeholders.length > 0) {
            sql = sql.replace(/\$\d+/g, '?');
            placeholders.forEach(p => {
                if (p.paramIndex >= 0 && p.paramIndex < params.length) {
                    newParams.push(params[p.paramIndex]);
                } else {
                    newParams.push(null);
                }
            });
          } else {
             newParams.push(...params);
          }
      }

      sql = sql.replace(/\sILIKE\s/gi, ' LIKE ');
      sql = sql.replace(/json_agg/gi, 'json_group_array');
      sql = sql.replace(/true/gi, '1'); 
      sql = sql.replace(/false/gi, '0');
      sql = sql.replace(/NOW\(\)/gi, "datetime('now')");

      const isSelect = /^\s*SELECT/i.test(sql) || /RETURNING/i.test(sql);

      if (isSelect) {
        this.db.all(sql, newParams, (err, rows) => {
          if (err) {
            console.error('SQLite Query Error:', err.message, '\nSQL:', sql);
            reject(err);
          } else {
            const result = { 
              rows: rows, 
              rowCount: rows.length,
              command: isSelect ? 'SELECT' : 'UPDATE' 
            };
            resolve(result);
          }
        });
      } else {
        this.db.run(sql, newParams, function(err) {
          if (err) {
            console.error('SQLite Run Error:', err.message, '\nSQL:', sql);
            reject(err);
          } else {
            const result = { 
              rows: [], 
              rowCount: this.changes,
              oid: this.lastID 
            };
            resolve(result);
          }
        });
      }
    });

    // Handle callback if provided
    if (callback) {
        promise
            .then(res => callback(null, res))
            .catch(err => callback(err));
        return undefined; // Usually pg returns undefined if callback is used? Or void.
    }

    return promise;
  }
}

module.exports = { SQLitePool };
