import { pgTable, text, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),

  //basic file/folder information
  name: text("name").notNull(),
  path: text("path").notNull(), // /document/project/resum
  size: integer("size").notNull(),
  type: text("type").notNull(), //"folder"

  // storage information
  fileUrl: text("file_url"),
});
