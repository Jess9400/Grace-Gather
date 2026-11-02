import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const likes=sqliteTable('likes',{item:text('item').notNull(),user:text('user').notNull(),created:integer('created').notNull()},t=>[primaryKey({columns:[t.item,t.user]})]);
export const comments=sqliteTable('comments',{id:text('id').primaryKey(),item:text('item').notNull(),user:text('user').notNull(),name:text('name').notNull(),body:text('body').notNull(),created:integer('created').notNull(),deleted:integer('deleted').notNull().default(0)},t=>[index('comments_item').on(t.item,t.created)]);
export const interests=sqliteTable('interests',{series:text('series').notNull(),user:text('user').notNull(),created:integer('created').notNull()},t=>[primaryKey({columns:[t.series,t.user]})]);
