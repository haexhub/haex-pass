import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import tableNames from "../tableNames.json";
import manifest from "../../../haextension/manifest.json";

// Helper function to create prefixed table names
const getTableName = (name: string) => `${manifest.public_key}__${manifest.name}__${name}`;

export const haexPasswordsItemDetails = sqliteTable(
  getTableName(tableNames.haex.passwords.item_details),
  {
    id: text().primaryKey(),
    title: text(),
    username: text(),
    password: text(),
    note: text(),
    icon: text(),
    tags: text(),
    url: text(),
    otpSecret: text("otp_secret"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InsertHaexPasswordsItemDetails =
  typeof haexPasswordsItemDetails.$inferInsert;
export type SelectHaexPasswordsItemDetails =
  typeof haexPasswordsItemDetails.$inferSelect;

export const haexPasswordsItemKeyValues = sqliteTable(
  getTableName(tableNames.haex.passwords.item_key_values),
  {
    id: text().primaryKey(),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id
    ),
    key: text(),
    value: text(),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InserthaexPasswordsItemKeyValues =
  typeof haexPasswordsItemKeyValues.$inferInsert;
export type SelectHaexPasswordsItemKeyValues =
  typeof haexPasswordsItemKeyValues.$inferSelect;

export const haexPasswordsItemHistory = sqliteTable(
  getTableName(tableNames.haex.passwords.item_histories),
  {
    id: text().primaryKey(),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id
    ),
    changedProperty:
      text("changed_property").$type<keyof typeof haexPasswordsItemDetails>(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  }
);
export type InserthaexPasswordsItemHistory =
  typeof haexPasswordsItemHistory.$inferInsert;
export type SelectHaexPasswordsItemHistory =
  typeof haexPasswordsItemHistory.$inferSelect;

export const haexPasswordsGroups = sqliteTable(
  getTableName(tableNames.haex.passwords.groups),
  {
    id: text().primaryKey(),
    name: text(),
    description: text(),
    icon: text(),
    order: integer(),
    color: text(),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => haexPasswordsGroups.id
    ),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InsertHaexPasswordsGroups = typeof haexPasswordsGroups.$inferInsert;
export type SelectHaexPasswordsGroups = typeof haexPasswordsGroups.$inferSelect;

export const haexPasswordsGroupItems = sqliteTable(
  getTableName(tableNames.haex.passwords.group_items),
  {
    groupId: text("group_id").references(
      (): AnySQLiteColumn => haexPasswordsGroups.id
    ),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id
    ),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.groupId] })]
);
export type InsertHaexPasswordsGroupItems =
  typeof haexPasswordsGroupItems.$inferInsert;
export type SelectHaexPasswordsGroupItems =
  typeof haexPasswordsGroupItems.$inferSelect;
