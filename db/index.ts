import { Pool, types, type PoolClient, type QueryResult } from "pg";
import { readFileSync } from "node:fs";

type Row = Record<string, unknown>;
type StatementResult = {
  results: Row[];
  success: true;
  meta: { changes: number };
};

const poolKey = Symbol.for("salvacel.postgres.pool");
type PoolGlobal = typeof globalThis & { [poolKey]?: Pool };

types.setTypeParser(20, (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
});

function getPool(): Pool {
  const shared = globalThis as PoolGlobal;
  if (shared[poolKey]) return shared[poolKey];

  const passwordFile = process.env.PGPASSWORD_FILE;
  const password = process.env.PGPASSWORD || (passwordFile ? readFileSync(passwordFile, "utf8").trim() : undefined);
  if (!password) throw new Error("Falta configurar el secreto local de PostgreSQL.");

  const pool = new Pool({
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "salvacel",
    password,
    database: process.env.PGDATABASE || "salvacel",
    max: Number(process.env.PG_POOL_MAX || 10),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (error) => {
    console.error("Error inesperado en el pool PostgreSQL de Salvacel.", error);
  });
  shared[poolKey] = pool;
  return pool;
}

function postgresSql(source: string): string {
  const ignoreConflict = /\bINSERT\s+OR\s+IGNORE\s+INTO\b/i.test(source);
  let result = "";
  let parameter = 0;
  let quote: "'" | '"' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      result += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      result += char;
      if (char === "*" && next === "/") {
        result += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      result += char;
      if (char === quote) {
        if (next === quote) {
          result += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "-" && next === "-") {
      result += "--";
      index += 1;
      lineComment = true;
    } else if (char === "/" && next === "*") {
      result += "/*";
      index += 1;
      blockComment = true;
    } else if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else if (char === "?") {
      parameter += 1;
      result += `$${parameter}`;
    } else {
      result += char;
    }
  }

  result = result.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, "INSERT INTO");
  result = result.replace(
    /\bINSERT\s+OR\s+REPLACE\s+INTO\s+sessions\b/gi,
    "INSERT INTO sessions",
  );
  if (/^\s*INSERT\s+INTO\s+sessions\b/i.test(result) && !/\bON\s+CONFLICT\b/i.test(result)) {
    result = result.replace(/\s*;?\s*$/, " ON CONFLICT (token_hash) DO UPDATE SET created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at");
  }
  if (ignoreConflict && !/\bON\s+CONFLICT\b/i.test(result)) {
    result = result.replace(/\s*;?\s*$/, " ON CONFLICT DO NOTHING");
  }
  return result.replace(/([\w.]+)\s+COLLATE\s+NOCASE/gi, "LOWER($1)");
}

class PreparedStatement {
  constructor(
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): PreparedStatement {
    return new PreparedStatement(this.sql, values);
  }

  async all(client?: PoolClient): Promise<StatementResult> {
    const sql = postgresSql(this.sql);
    const result = await (client ?? getPool()).query<Row>(sql, this.values);
    return toStatementResult(result);
  }

  async first(columnName?: string): Promise<Row | unknown | null> {
    const result = await getPool().query<Row>(postgresSql(this.sql), this.values);
    const row = toStatementResult(result).results[0];
    return row ? (columnName ? row[columnName] ?? null : row) : null;
  }

  async run(client?: PoolClient): Promise<StatementResult> {
    const sql = postgresSql(this.sql);
    const result = await (client ?? getPool()).query<Row>(sql, this.values);
    return toStatementResult(result);
  }
}

function toStatementResult(result: QueryResult<Row>): StatementResult {
  const bigintFields = new Set(
    result.fields.filter((field) => field.dataTypeID === 20).map((field) => field.name),
  );
  const rows = result.rows.map((row) => {
    const normalized = { ...row };
    for (const field of bigintFields) {
      const value = normalized[field];
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isSafeInteger(parsed)) normalized[field] = parsed;
      }
    }
    return normalized;
  });
  return {
    results: rows,
    success: true,
    meta: { changes: result.rowCount ?? 0 },
  };
}

class PostgresDatabase {
  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(sql);
  }

  async batch(statements: PreparedStatement[]): Promise<StatementResult[]> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const results: StatementResult[] = [];
      for (const statement of statements) results.push(await statement.run(client));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '5s'");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

const database = new PostgresDatabase();
export function getDatabase(): PostgresDatabase {
  return database;
}

export { postgresSql };
