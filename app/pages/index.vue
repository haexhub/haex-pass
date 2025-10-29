<!-- pages/index.vue -->
<template>
  <div class="flex flex-1 flex-col p-6 gap-6">
    <div>
      <h1 class="text-3xl font-bold mb-2">Haex Pass</h1>
      <p class="text-gray-500 dark:text-gray-400">Database Connection Test</p>
    </div>

    <div class="flex flex-wrap gap-3">
      <UButton
        icon="i-heroicons-plus-circle"
        color="primary"
        size="lg"
        @click="createTable"
      >
        Create Test Table
      </UButton>

      <UButton
        icon="i-heroicons-table-cells"
        color="neutral"
        variant="soft"
        size="lg"
        @click="listTables"
      >
        List Tables
      </UButton>

      <UButton
        icon="i-heroicons-arrow-down-tray"
        color="success"
        variant="soft"
        size="lg"
        @click="insertTestData"
      >
        Insert Test Data
      </UButton>

      <UButton
        icon="i-heroicons-magnifying-glass"
        color="secondary"
        variant="soft"
        size="lg"
        @click="queryTestData"
      >
        Query Test Data
      </UButton>
    </div>

    <UAlert
      v-if="status"
      :color="isError ? 'error' : 'success'"
      :icon="
        isError
          ? 'i-heroicons-exclamation-triangle'
          : 'i-heroicons-check-circle'
      "
      :title="isError ? 'Error' : 'Success'"
      :description="status"
    />

    <UCard v-if="tables.length">
      <template #header>
        <h2 class="text-lg font-semibold">Tables</h2>
      </template>
      <ul class="space-y-2">
        <li
          v-for="table in tables"
          :key="table"
          class="flex items-center gap-2"
        >
          <UIcon name="i-heroicons-table-cells" class="text-primary" />
          <code class="text-sm">{{ table }}</code>
        </li>
      </ul>
    </UCard>

    <UCard v-if="testData.length">
      <template #header>
        <h2 class="text-lg font-semibold">
          Test Data ({{ testData.length }} records)
        </h2>
      </template>
      <pre class="text-xs overflow-auto">{{
        JSON.stringify(testData, null, 2)
      }}</pre>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const status = ref("");
const tables = ref<string[]>([]);
const testData = ref<Array<Record<string, unknown>>>([]);
const isError = ref(false);

// Initialize HaexHub once in setup
const { client, getTableName, db } = useHaexHub();

// Debug: Check what's available on db
console.log("DB object:", db);
if (db) {
  console.log("DB keys:", Object.keys(db));
  console.log(
    "DB prototype:",
    Object.getOwnPropertyNames(Object.getPrototypeOf(db))
  );
}

const createTable = async () => {
  try {
    status.value = "Creating test table...";
    isError.value = false;

    // Get the prefixed table name
    const tableName = getTableName("test_table");
    console.log("Creating table with name:", tableName);

    const query = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

    console.log("SQL Query:", query);
    console.log("SQL Query (JSON):", JSON.stringify(query));

    // Create table using high-level API
    await client.execute(query);

    status.value = `Test table created successfully!\nTable name: ${tableName}`;
  } catch (error) {
    console.error("Create table failed:", error);
    status.value = `Error: ${JSON.stringify(error, null, 2)}`;
    isError.value = true;
  }
};

const listTables = async () => {
  try {
    status.value = "Checking test table...";
    isError.value = false;

    const tableName = getTableName("test_table");

    // Try to query the table - if it exists, we get results, otherwise an error
    try {
      await client.query(`SELECT name FROM ${tableName} LIMIT 1`);

      tables.value = [tableName];
      status.value = `Test table exists: ${tableName}`;
    } catch {
      tables.value = [];
      status.value = `Test table does not exist yet. Create it first.`;
    }
  } catch (error) {
    console.error("List tables failed:", error);
    status.value = `Error: ${JSON.stringify(error, null, 2)}`;
    isError.value = true;
  }
};

const insertTestData = async () => {
  try {
    status.value = "Inserting test data...";
    isError.value = false;

    const tableName = getTableName("test_table");

    // Insert test data using high-level API
    await client.execute(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`, [
      crypto.randomUUID(),
      `Test User ${Date.now()}`,
    ]);

    status.value = "Test data inserted successfully!";
  } catch (error) {
    console.error("Insert data failed:", error);
    status.value = `Error: ${error}`;
    isError.value = true;
  }
};

const queryTestData = async () => {
  try {
    status.value = "Querying test data...";
    isError.value = false;

    const tableName = getTableName("test_table");

    // Query all test data using high-level API
    const result = await client.query<Record<string, unknown>>(
      `SELECT * FROM ${tableName}`
    );
    console.log("Test data:", result);

    testData.value = result;
    status.value = `Found ${result.length} record(s)`;
  } catch (error) {
    console.error("Query data failed:", error);
    status.value = `Error: ${error}`;
    isError.value = true;
  }
};
</script>
