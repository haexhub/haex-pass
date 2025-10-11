<!-- pages/index.vue -->
<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-blue-400">
      Database Test Extension
    </h1>

    <div>
      <NuxtLink to="/test">Test</NuxtLink>
      <NuxtLink to="/about">About</NuxtLink>
    </div>

    <!-- Extension Info -->
    <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4 text-green-400">Extension Info</h2>
      <div v-if="extensionInfo" class="grid grid-cols-2 gap-4">
        <div>
          <span class="text-gray-400">Name:</span>
          <span class="ml-2 font-mono text-blue-300">
            {{ extensionInfo.name }}
          </span>
        </div>
        <div>
          <span class="text-gray-400">Version:</span>
          <span class="ml-2 font-mono text-blue-300">{{
            extensionInfo.version
          }}</span>
        </div>
        <div>
          <span class="text-gray-400">Key Hash:</span>
          <span class="ml-2 font-mono text-blue-300 text-sm">{{
            extensionInfo.keyHash
          }}</span>
        </div>
        <div>
          <span class="text-gray-400">Theme:</span>
          <span class="ml-2 font-mono text-blue-300">{{ context?.theme }}</span>
        </div>
      </div>
      <div v-else class="text-red-400">Loading extension info...</div>
    </div>

    <!-- Table Management -->
    <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4 text-green-400">
        Table Management
      </h2>

      <div class="mb-4">
        <label class="block text-sm text-gray-400 mb-2">Table Name:</label>
        <input
          v-model="tableName"
          type="text"
          class="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-gray-100 font-mono"
          placeholder="users"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton @click="createTable">Create Table</UButton>
        <UButton @click="listTables">List Tables</UButton>
        <UButton @click="checkTableExists"> Check Exists </UButton>
        <UButton @click="dropTable">Drop Table</UButton>
      </div>
    </div>

    <!-- Data Operations -->
    <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4 text-green-400">Data Operations</h2>

      <div class="flex flex-wrap gap-2">
        <UButton @click="insertData" class="btn-primary">
          Insert Test Data
        </UButton>
        <UButton @click="queryData" class="btn-secondary"
          >Query All Data</UButton
        >
        <UButton @click="updateData" class="btn-secondary">Update Data</UButton>
        <UButton @click="deleteData" class="btn-secondary">Delete Data</UButton>
        <UButton @click="countRecords" class="btn-secondary">
          Count Records
        </UButton>
      </div>
    </div>

    <!-- Custom SQL -->
    <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4 text-green-400">Custom SQL</h2>

      <textarea
        v-model="customSql"
        class="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-gray-100 font-mono mb-4"
        rows="4"
        placeholder="SELECT * FROM users LIMIT 10"
      />

      <div class="flex gap-2">
        <UButton @click="executeQuery" class="btn-primary"
          >Execute Query</UButton
        >
        <UButton @click="executeCommand" class="btn-secondary">
          Execute Command
        </UButton>
      </div>
    </div>

    <!-- Output Log -->
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-green-400">Output Log</h2>
        <UButton @click="clearLog" class="btn-secondary text-sm">
          Clear Log
        </UButton>
      </div>

      <div
        class="bg-gray-900 rounded p-4 max-h-96 overflow-auto font-mono text-sm"
      >
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="mb-2 pb-2 border-b border-gray-800"
        >
          <span class="text-gray-500 text-xs">{{ log.time }}</span>
          <pre
            :class="log.type === 'error' ? 'text-red-400' : 'text-green-400'"
            >{{ log.message }}</pre
          >
        </div>
        <div v-if="logs.length === 0" class="text-gray-500">No logs yet...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHaexHub } from "~/composables/haexhub";

const { db, extensionInfo, context, getTableName } = useHaexHub();

const tableName = ref("users");
const customSql = ref("SELECT * FROM users LIMIT 10");
const logs = ref<Array<{ time: string; message: string; type: string }>>([]);

const log = (message: string, type = "success") => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type,
  });
};

const clearLog = () => {
  logs.value = [];
};

// Table Management
const createTable = async () => {
  try {
    const table = getTableName(tableName.value);
    await db.createTable(
      table,
      `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    `
    );
    log(`Table '${table}' created successfully`);
  } catch (error: any) {
    log(`Create table error: ${error.message}`, "error");
  }
};

const listTables = async () => {
  try {
    const tables = await db.listTables();
    log(`Found ${tables.length} tables:\n${JSON.stringify(tables, null, 2)}`);
  } catch (error: any) {
    log(`List tables error: ${error.message}`, "error");
  }
};

const checkTableExists = async () => {
  try {
    const table = getTableName(tableName.value);
    const exists = await db.tableExists(table);
    log(`Table '${table}' exists: ${exists}`);
  } catch (error: any) {
    log(`Check table error: ${error.message}`, "error");
  }
};

const dropTable = async () => {
  if (!confirm("Are you sure?")) return;

  try {
    const table = getTableName(tableName.value);
    await db.dropTable(table);
    log(`Table '${table}' dropped successfully`);
  } catch (error: any) {
    log(`Drop table error: ${error.message}`, "error");
  }
};

// Data Operations
const insertData = async () => {
  try {
    const table = getTableName(tableName.value);
    const id = await db.insert(table, {
      name: `User ${Date.now()}`,
      email: `user${Date.now()}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
    });
    log(`Inserted record with ID: ${id}`);
  } catch (error: any) {
    log(`Insert error: ${error.message}`, "error");
  }
};

const queryData = async () => {
  try {
    const table = getTableName(tableName.value);
    const rows = await db.query(`SELECT * FROM ${table}`);
    log(`Found ${rows.length} records:\n${JSON.stringify(rows, null, 2)}`);
  } catch (error: any) {
    log(`Query error: ${error.message}`, "error");
  }
};

const updateData = async () => {
  try {
    const table = getTableName(tableName.value);
    const affected = await db.update(table, { age: 99 }, "age < ?", [30]);
    log(`Updated ${affected} records`);
  } catch (error: any) {
    log(`Update error: ${error.message}`, "error");
  }
};

const deleteData = async () => {
  try {
    const table = getTableName(tableName.value);
    const affected = await db.delete(table, "age > ?", [90]);
    log(`Deleted ${affected} records`);
  } catch (error: any) {
    log(`Delete error: ${error.message}`, "error");
  }
};

const countRecords = async () => {
  try {
    const table = getTableName(tableName.value);
    const count = await db.count(table);
    log(`Total records: ${count}`);
  } catch (error: any) {
    log(`Count error: ${error.message}`, "error");
  }
};

// Custom SQL
const executeQuery = async () => {
  try {
    const rows = await db.query(customSql.value);
    log(
      `Query returned ${rows.length} rows:\n${JSON.stringify(rows, null, 2)}`
    );
  } catch (error: any) {
    log(`Query error: ${error.message}`, "error");
  }
};

const executeCommand = async () => {
  try {
    const result = await db.execute(customSql.value);
    log(`Command executed:\n${JSON.stringify(result, null, 2)}`);
  } catch (error: any) {
    log(`Execute error: ${error.message}`, "error");
  }
};
</script>

<!-- <style scoped>
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition;
}

.btn-secondary {
  @apply bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition;
}

.btn-danger {
  @apply bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition;
}
</style> -->
