import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("resources", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.text("description").nullable();
    table.string("status", 20).defaultTo("ACTIVE").notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("resources");
}
