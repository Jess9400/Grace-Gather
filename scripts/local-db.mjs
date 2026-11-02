import {DatabaseSync} from 'node:sqlite';
export function sqliteAdapter(path=':memory:'){
 const db=new DatabaseSync(path);
 return {exec:sql=>db.exec(sql),close:()=>db.close(),prepare(sql){let args=[];const statement={bind(...values){args=values;return statement;},async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)??null;},async run(){return {success:true,meta:db.prepare(sql).run(...args)};}};return statement;},async batch(statements){db.exec('BEGIN');try{const rows=await Promise.all(statements.map(s=>s.all()));db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
