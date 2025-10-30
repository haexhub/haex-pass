# HaexHub Drizzle with IPC Implementation Analysis

## Overview
HaexHub implements a sophisticated Drizzle ORM integration that works across process boundaries using IPC (Inter-Process Communication). Extensions running in sandboxed iframes send SQL queries via postMessage to the main application, which then invokes Tauri backend commands to execute against SQLite. Results are automatically mapped back through Drizzle's proxy adapter.

## Architecture Flow Diagram

```
Extension (Frontend)
    |
    | postMessage (JSON)
    | haextension.db.query/execute
    v
HaexHub Main App (Frontend)
    |
    | invoke() (Tauri Command)
    | extension_sql_select/execute
    v
Tauri Backend (Rust)
    |
    | SQLite Direct Execution
    v
Database (SQLite)
    |
    | Result (JSON)
    v
Tauri Backend (Returns JSON)
    |
    | invoke Result
    v
HaexHub Main App (Frontend)
    |
    | drizzleCallback processes
    | rows and formats for Drizzle
    v
Drizzle ORM
    |
    | Automatic column mapping
    v
Strongly-typed Results
```

---

## 1. Extension Frontend: SDK Client Implementation

### File: `/home/haex/Projekte/haexhub-sdk/src/client.ts`

#### 1.1 Drizzle Initialization
The SDK provides a method to initialize Drizzle with a remote callback:

```typescript
// Lines 84-152
public initializeDatabase<T extends Record<string, unknown>>(
  schema: T
): SqliteRemoteDatabase<T> {
  const dbInstance = drizzle<T>(
    async (
      sql: string,
      params: unknown[],
      method: "get" | "run" | "all" | "values"
    ) => {
      // Maps different Drizzle methods to appropriate IPC calls
      if (method === "run") {
        // INSERT/UPDATE/DELETE → haextension.db.execute
        const result = await this.request<DatabaseQueryResult>(
          "haextension.db.execute",
          { query: sql, params }
        );
        return result;
      }

      // "get", "all", "values" → haextension.db.query
      const result = await this.request<DatabaseQueryResult>(
        "haextension.db.query",
        { query: sql, params }
      );

      const rows = result.rows as any[];

      if (method === "get") {
        return rows[0] ?? null;  // Single row
      }

      if (method === "values") {
        return rows.map((row) => Object.values(row));  // Array of arrays
      }

      return rows;  // Array of objects
    },
    schema
  );

  this.db = dbInstance;
  return dbInstance;
}
```

#### 1.2 IPC Request Mechanism
```typescript
// Lines 314-350
public async request<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const requestId = this.generateRequestId();

  const request: HaexHubRequest = {
    method,
    params,
    timestamp: Date.now(),
  };

  return new Promise<T>((resolve, reject) => {
    // Register pending request with timeout handling
    this.pendingRequests.set(requestId, { resolve, reject, timeout });

    // Send via postMessage with wildcard origin (sandboxed iframe)
    window.parent.postMessage({ id: requestId, ...request }, "*");
  });
}
```

---

## 2. HaexHub Main App: Extension Message Handler

### File: `/home/haex/Projekte/haex-hub/src/composables/extensionMessageHandler.ts`

#### 2.1 Global Message Listener (Lines 36-218)
```typescript
window.addEventListener('message', async (event: MessageEvent) => {
  const request = event.data as ExtensionRequest;

  // Request routing by method prefix
  if (request.method.startsWith('haextension.db.')) {
    result = await handleDatabaseMethodAsync(request, instance.extension);
  }

  // Send response back to extension
  ;(event.source as Window)?.postMessage(
    {
      id: request.id,
      result,
    },
    targetOrigin,
  );
});
```

#### 2.2 Database Handler (Lines 357-416)
This is the critical bridge between IPC and Tauri:

```typescript
async function handleDatabaseMethodAsync(
  request: ExtensionRequest,
  extension: IHaexHubExtension,
) {
  const params = request.params as {
    query?: string
    params?: unknown[]
  }

  switch (request.method) {
    case 'haextension.db.query': {
      // SELECT queries
      const rows = await invoke<unknown[]>('extension_sql_select', {
        sql: params.query || '',
        params: params.params || [],
        publicKey: extension.publicKey,
        name: extension.name,
      })

      return {
        rows,              // Raw JSON objects with column names as keys
        rowsAffected: 0,
        lastInsertId: undefined,
      }
    }

    case 'haextension.db.execute': {
      // INSERT/UPDATE/DELETE
      await invoke<string[]>('extension_sql_execute', {
        sql: params.query || '',
        params: params.params || [],
        publicKey: extension.publicKey,
        name: extension.name,
      })

      return {
        rows: [],
        rowsAffected: 1,
        lastInsertId: undefined,
      }
    }
  }
}
```

---

## 3. Tauri Backend: SQL Execution and Result Mapping

### File: `/home/haex/Projekte/haex-hub/src-tauri/src/extension/database/mod.rs`

#### 3.1 SELECT Handler (Lines 190-274)
This is where the magic happens - rows are converted to JSON with column names:

```rust
#[tauri::command]
pub async fn extension_sql_select(
    sql: &str,
    params: Vec<JsonValue>,
    public_key: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Vec<JsonValue>, ExtensionError> {
    // Permission validation and SQL parsing...

    with_connection(&state.db, |conn| {
        let mut prepared_stmt = conn.prepare(&transformed_sql)?;

        // KEY STEP: Extract column names from prepared statement
        let column_names: Vec<String> = prepared_stmt
            .column_names()
            .into_iter()
            .map(|s| s.to_string())
            .collect();

        // Execute query with parameters
        let rows = prepared_stmt
            .query_map(params_from_iter(sql_params.iter()), |row| {
                row_to_json_value(row, &column_names)  // Convert each row
            })?;

        let mut results = Vec::new();
        for row_result in rows {
            results.push(row_result?);
        }

        Ok(results)
    })
}
```

#### 3.2 Row-to-JSON Conversion (Lines 276-294)
**This is the automatic column mapping that Drizzle relies on:**

```rust
fn row_to_json_value(
    row: &rusqlite::Row,
    columns: &[String],
) -> Result<JsonValue, rusqlite::Error> {
    let mut map = serde_json::Map::new();
    
    // Map each column by name
    for (i, col_name) in columns.iter().enumerate() {
        let value = row.get::<usize, rusqlite::types::Value>(i)?;
        let json_value = match value {
            rusqlite::types::Value::Null => JsonValue::Null,
            rusqlite::types::Value::Integer(i) => json!(i),
            rusqlite::types::Value::Real(f) => json!(f),
            rusqlite::types::Value::Text(s) => json!(s),
            rusqlite::types::Value::Blob(blob) => json!(blob.to_vec()),
        };
        map.insert(col_name.clone(), json_value);  // KEY: column name as key
    }
    Ok(JsonValue::Object(map))
}
```

#### 3.3 Execute Handler (Lines 106-188)
For write operations (INSERT/UPDATE/DELETE):

```rust
#[tauri::command]
pub async fn extension_sql_execute(
    sql: &str,
    params: Vec<JsonValue>,
    public_key: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, ExtensionError> {
    // Validation and transformation...
    
    with_connection(&state.db, |conn| {
        let tx = conn.transaction()?;
        
        // Execute with CRDT transformation (adds tombstone column, HLC timestamp, etc.)
        let sql_values = ValueConverter::convert_params(&params)?;
        
        for statement in ast_vec {
            executor.execute_statement_with_params(&statement, &sql_values)?;
        }
        
        tx.commit()?;
        Ok(modified_schema_tables.into_iter().collect())
    })
}
```

---

## 4. HaexHub Main App: Vault Store with Drizzle

### File: `/home/haex/Projekte/haex-hub/src/stores/vault/index.ts`

The vault store demonstrates how the main application uses Drizzle for the primary vault:

#### 4.1 Vault Drizzle Initialization (Lines 40-73)
```typescript
const openAsync = async ({
  path = '',
  password,
}: {
  path: string
  password: string
}) => {
  // Open vault via Tauri backend
  await invoke<string>('open_encrypted_database', {
    vaultPath: path,
    key: password,
  })

  const vaultId = await getVaultIdAsync(path)

  // Create Drizzle instance with drizzleCallback
  openVaults.value = {
    ...openVaults.value,
    [vaultId]: {
      name: fileName,
      drizzle: drizzle<typeof schema>(drizzleCallback, {
        schema: schema,
        logger: false,
      }),
    },
  }

  return vaultId
}
```

#### 4.2 Drizzle Callback for Vault (Lines 124-187)
**This shows how to handle different SQL statement types:**

```typescript
const drizzleCallback = (async (
  sql: string,
  params: unknown[],
  method: 'get' | 'run' | 'all' | 'values',
) => {
  let rows: any[] = []

  try {
    if (isSelectQuery(sql)) {
      // SELECT statements
      rows = await invoke<unknown[]>('sql_select_with_crdt', {
        sql,
        params,
      })
    } else if (hasReturning(sql)) {
      // INSERT/UPDATE/DELETE with RETURNING
      rows = await invoke<unknown[]>('sql_query_with_crdt', {
        sql,
        params,
      })
    } else {
      // INSERT/UPDATE/DELETE without RETURNING
      await invoke<unknown[]>('sql_execute_with_crdt', {
        sql,
        params,
      })
    }
  } catch (error) {
    console.error('Fehler im drizzleCallback invoke:', error)
  }

  // Format response based on Drizzle's expected method
  if (method === 'get') {
    return rows.length > 0 ? { rows: rows.at(0) } : { rows }
  }
  return { rows }
}) satisfies AsyncRemoteCallback
```

---

## 5. Example: Extension Using Drizzle

### File: `/home/haex/Projekte/haex-demo/app/database/index.ts`

Extensions use the sqlite-proxy adapter (dummy executor never called):

```typescript
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from './schemas'

const dummyExecutor = async (
  sql: string,
  params: unknown[],
  method: 'all' | 'run' | 'get' | 'values',
) => {
  console.warn(
    `Frontend Drizzle Executor was called. This shouldn't happen in Tauri workflow!`,
  )
  return { rows: [] }
}

export const db = drizzle(dummyExecutor, { schema })
```

#### Usage in Stores (Lines 36-46):
```typescript
const syncItemsAsync = async () => {
  const { currentVault } = useVaultStore();
  items.value =
    (await currentVault?.drizzle
      .select()
      .from(haexPasswordsItemDetails)
      .innerJoin(
        haexPasswordsGroupItems,
        eq(haexPasswordsItemDetails.id, haexPasswordsGroupItems.itemId)
      )) ?? [];
};
```

---

## 6. Result Format and Type Mapping

### Database Query Result Structure

```typescript
interface DatabaseQueryResult {
  rows: unknown[]        // Array of JSON objects
  rowsAffected: number   // For INSERT/UPDATE/DELETE
  lastInsertId?: number  // For INSERT statements
}
```

### Example Row Format

**SQL:** `SELECT id, title, username FROM passwords WHERE id = ?`

**Rust Response (JSON):**
```json
[
  {
    "id": "uuid-123",
    "title": "My Password",
    "username": "user@example.com"
  }
]
```

**Drizzle Processing:**
- Receives: `[{ id: "uuid-123", title: "My Password", username: "user@example.com" }]`
- Applies schema type: `SelectHaexPasswordsItemDetails`
- Returns: Strongly typed object with automatic column name mapping

### Type Inference Chain

```typescript
// 1. Schema definition
export const haexPasswordsItemDetails = sqliteTable(
  'haex_passwords_item_details',
  {
    id: text().primaryKey(),
    title: text(),
    username: text(),
  },
)

// 2. Type extraction
export type SelectHaexPasswordsItemDetails = 
  typeof haexPasswordsItemDetails.$inferSelect

// 3. Usage with Drizzle
const items = await db
  .select()
  .from(haexPasswordsItemDetails)
  // Returns: SelectHaexPasswordsItemDetails[]

// 4. Column mapping happens automatically
items.map(item => item.title)  // TypeScript knows 'title' exists
```

---

## 7. Key Implementation Details

### 7.1 Column Name Preservation
The automatic column mapping works because:
1. SQLite prepared statement provides `column_names()`
2. Rust code creates JSON map with these exact names as keys
3. Drizzle receives JSON with column names matching schema properties

### 7.2 Parameter Binding
Both levels support parameterized queries:
```typescript
// SDK sends params separately
await this.request("haextension.db.query", {
  query: "SELECT * FROM items WHERE id = ?",
  params: ["123"]
})

// Rust validates parameter count
let total_placeholders = sql.matches('?').count();
if total_placeholders != params.len() {
  return Err(ParameterMismatchError)
}
```

### 7.3 Method Routing in Drizzle Proxy
```
Drizzle method → IPC method mapping:
- method === "run"    → haextension.db.execute
- method === "get"    → haextension.db.query + return rows[0]
- method === "all"    → haextension.db.query + return rows
- method === "values" → haextension.db.query + return Object.values(rows)
```

### 7.4 Transaction Support
The SDK/Drizzle proxy automatically handles transactions via Drizzle's transaction API, which generates multiple SQL statements that are executed in sequence.

---

## 8. Request/Response Flow Example

### Query: "SELECT * FROM haex_passwords_item_details WHERE id = ?"

1. **Extension calls Drizzle:**
   ```typescript
   const item = await db
     .select()
     .from(haexPasswordsItemDetails)
     .where(eq(haexPasswordsItemDetails.id, "uuid-123"))
     .get()
   ```

2. **Drizzle generates SQL:**
   ```
   sql: SELECT "id", "title", "username", ... FROM "haex_passwords_item_details" WHERE "id" = ?
   params: ["uuid-123"]
   method: "get"
   ```

3. **SDK sends IPC request:**
   ```json
   {
     "id": "req_1",
     "method": "haextension.db.query",
     "params": {
       "query": "SELECT ...",
       "params": ["uuid-123"]
     },
     "timestamp": 1234567890
   }
   ```

4. **HaexHub handler receives postMessage:**
   - Looks up extension by origin
   - Calls `handleDatabaseMethodAsync`
   - Invokes `extension_sql_select` Tauri command

5. **Rust backend executes:**
   - Parses SQL
   - Validates permissions
   - Prepares statement: `SELECT "id", "title", "username", ...`
   - Gets column names: `["id", "title", "username", ...]`
   - Executes query with params
   - For each row, creates JSON object:
     ```json
     {
       "id": "uuid-123",
       "title": "My Password",
       "username": "user@example.com"
     }
     ```

6. **Response returns:**
   ```json
   {
     "rows": [
       {
         "id": "uuid-123",
         "title": "My Password",
         "username": "user@example.com"
       }
     ],
     "rowsAffected": 0,
     "lastInsertId": null
   }
   ```

7. **SDK callback processes result:**
   ```typescript
   // method === "get", so return first row
   const rows = [{ id: "uuid-123", title: "...", username: "..." }]
   return rows[0] ?? null
   ```

8. **Drizzle applies schema:**
   - Maps JSON keys to schema columns
   - Validates types match column definitions
   - Returns `SelectHaexPasswordsItemDetails` type

9. **Application receives:**
   ```typescript
   {
     id: "uuid-123",
     title: "My Password",
     username: "user@example.com"
   } // as SelectHaexPasswordsItemDetails
   ```

---

## 9. Advantages of This Architecture

1. **Type Safety**: Full TypeScript types from Drizzle schema
2. **Separation of Concerns**: Frontend, backend, and Rust layers cleanly separated
3. **Flexibility**: Same mechanism works for extensions and main app
4. **Automatic Column Mapping**: Rust handles the JSON structure → Drizzle handles type inference
5. **Sandboxing**: Extensions never have direct database access
6. **Validation**: Permissions checked at multiple levels

---

## 10. Critical Files Reference

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| SDK Drizzle Init | `/haexhub-sdk/src/client.ts` | 84-152 | Database initialization |
| SDK IPC | `/haexhub-sdk/src/client.ts` | 314-350 | postMessage request |
| Extension Handler | `/haex-hub/src/composables/extensionMessageHandler.ts` | 357-416 | Route IPC to Tauri |
| Rust SELECT | `/haex-hub/src-tauri/src/extension/database/mod.rs` | 190-274 | Execute query |
| Row Mapping | `/haex-hub/src-tauri/src/extension/database/mod.rs` | 276-294 | JSON conversion |
| Vault Drizzle | `/haex-hub/src/stores/vault/index.ts` | 61-65 | Main app database |
| Vault Callback | `/haex-hub/src/stores/vault/index.ts` | 134-187 | Query routing |

---

## 11. Summary

The implementation creates a seamless Drizzle ORM experience across process boundaries:

- **Frontend** uses Drizzle ORM normally with `db.select()`, `db.insert()`, etc.
- **SDK proxy callback** intercepts SQL and sends via postMessage
- **HaexHub handler** routes to appropriate Tauri command
- **Rust backend** executes SQL and maps results to JSON with column names
- **Drizzle type system** automatically applies schema types based on column names
- **Results** arrive back in the frontend strongly typed and ready to use

The key insight is that **Drizzle handles column mapping through the JSON object structure** - as long as the JSON objects have keys matching the column names in the schema, Drizzle automatically maps them to the correct properties with the correct types.
