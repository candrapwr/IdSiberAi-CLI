import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import chalk from 'chalk';
import { ValidationHelper } from './ValidationHelper.js';

export class DatabaseTools {
  constructor() {
    this.validator = new ValidationHelper();
    this.dbType = process.env.DB_TYPE || 'mysql';
    this.config = {
      mysql: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
      },
      postgres: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432
      }
    };
    this.pool = null;
  }

  async #validateConfig() {
    const required = ['host', 'user', 'database'];
    const missing = required.filter(field => !this.config[this.dbType][field]);
    
    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing database config: ${missing.join(', ')}`
      };
    }
    return { success: true };
  }

  async #connect() {
    try {
      const validation = await this.#validateConfig();
      if (!validation.success) return validation;
      
      console.log(chalk.blue(`🔌 Connecting to ${this.dbType} database...`));
      
      if (this.dbType === 'mysql') {
        this.pool = await mysql.createPool(this.config.mysql);
      } else {
        this.pool = new Pool(this.config.postgres);
      }
      
      // Test connection
      await this.pool.query('SELECT 1');
      console.log(chalk.green(`✅ Connected to ${this.dbType} database`));
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`
      };
    }
  }

  async executeQuery(query, params = []) {
    try {
      // Validate query
      if (!query || typeof query !== 'string') {
        return {
          success: false,
          error: 'Invalid query - must be a non-empty string'
        };
      }
      
      // Connect if needed
      if (!this.pool) {
        const connection = await this.#connect();
        if (!connection.success) return connection;
      }
      
      console.log(chalk.blue(`📝 Executing query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`));
      
      let result;
      if (this.dbType === 'mysql') {
        const [rows] = await this.pool.query(query, params);
        result = rows;
      } else {
        const { rows } = await this.pool.query(query, params);
        result = rows;
      }
      
      return {
        success: true,
        data: result,
        count: result?.length || 0,
        query: query.substring(0, 100),
        message: `Query executed successfully (${result?.length || 0} results)`
      };
    } catch (error) {
      console.error(chalk.red(`❌ Query failed: ${error.message}`));
      return {
        success: false,
        error: error.message,
        query: query.substring(0, 100),
        suggestions: 'Check SQL syntax and parameters'
      };
    }
  }

  async close() {
    try {
      if (this.pool) {
        console.log(chalk.blue('🛑 Closing database connection...'));
        await this.pool.end();
        this.pool = null;
        console.log(chalk.green('✅ Database connection closed'));
        return { success: true };
      }
      return { success: true, message: 'No active connection to close' };
    } catch (error) {
      return {
        success: false,
        error: `Failed to close connection: ${error.message}`
      };
    }
  }
}

export default new DatabaseTools();