import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { createTestDatabase } from './test-database.mjs'

const db = await createTestDatabase()
try {
  const enums =
    await db.query(`select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' group by t.typname order by t.typname`)
  const enumNames = new Set(enums.rows.map((row) => row.typname))
  const typeName = (name) => {
    if (name.startsWith('_')) return `(${typeName(name.slice(1))})[]`
    if (enumNames.has(name)) return `Database['public']['Enums']['${name}']`
    if (['int2', 'int4', 'int8', 'numeric', 'float4', 'float8'].includes(name))
      return 'number'
    if (name === 'bool') return 'boolean'
    if (name === 'json' || name === 'jsonb') return 'Json'
    if (name === 'void') return 'undefined'
    return 'string'
  }
  const relations =
    await db.query(`select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','v') order by c.relname`)
  const columns =
    await db.query(`select c.relname, a.attname, t.typname, a.attnotnull, a.atthasdef, a.attgenerated
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid join pg_type t on t.oid=a.atttypid
    where n.nspname='public' and c.relkind in ('r','v') and a.attnum > 0 and not a.attisdropped order by c.relname,a.attnum`)
  const foreignKeys =
    await db.query(`select src.relname, con.conname, dst.relname as referenced_relation,
    exists(select 1 from pg_index i where i.indrelid=src.oid and i.indisunique and i.indpred is null and i.indnkeyatts=array_length(con.conkey,1) and i.indkey::smallint[] @> con.conkey and i.indkey::smallint[] <@ con.conkey) as is_one_to_one,
    array(select att.attname from unnest(con.conkey) with ordinality k(attnum,pos) join pg_attribute att on att.attrelid=src.oid and att.attnum=k.attnum order by k.pos) as columns,
    array(select att.attname from unnest(con.confkey) with ordinality k(attnum,pos) join pg_attribute att on att.attrelid=dst.oid and att.attnum=k.attnum order by k.pos) as referenced_columns
    from pg_constraint con join pg_class src on src.oid=con.conrelid join pg_class dst on dst.oid=con.confrelid join pg_namespace n on n.oid=src.relnamespace
    where con.contype='f' and n.nspname='public' order by src.relname,con.conname`)
  const functions =
    await db.query(`select p.proname, p.proargnames, p.pronargdefaults, p.proisstrict,
    array(select t.typname from unnest(p.proargtypes::oid[]) with ordinality a(type_id,pos) join pg_type t on t.oid=a.type_id order by a.pos) as argument_types,
    r.typname as return_type from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type r on r.oid=p.prorettype
    where n.nspname='public' and p.proname like 'vault_%' order by p.proname`)
  const rowFields = (relname, mode) =>
    columns.rows
      .filter((col) => col.relname === relname)
      .map((col) => {
        const optional =
          mode === 'Update' ||
          (mode === 'Insert' &&
            (col.atthasdef || !col.attnotnull || col.attgenerated))
        return `          ${col.attname}${optional ? '?' : ''}: ${typeName(col.typname)}${col.attnotnull ? '' : ' | null'}`
      })
      .join('\n')
  const relationshipFields = (relname) =>
    foreignKeys.rows
      .filter((fk) => fk.relname === relname)
      .map(
        (fk) =>
          `          { foreignKeyName: '${fk.conname}'; columns: ${JSON.stringify(fk.columns)}; isOneToOne: ${fk.is_one_to_one}; referencedRelation: '${fk.referenced_relation}'; referencedColumns: ${JSON.stringify(fk.referenced_columns)} }`,
      )
      .join(',\n')
  const tableBlocks = relations.rows
    .filter((relation) => relation.relkind === 'r')
    .map(
      ({ relname }) => `      ${relname}: {
        Row: {\n${rowFields(relname, 'Row')}\n        }
        Insert: {\n${rowFields(relname, 'Insert')}\n        }
        Update: {\n${rowFields(relname, 'Update')}\n        }
        Relationships: [\n${relationshipFields(relname)}\n        ]
      }`,
    )
    .join('\n')
  const viewBlocks = relations.rows
    .filter((relation) => relation.relkind === 'v')
    .map(
      ({ relname }) => `      ${relname}: {
        Row: {\n${rowFields(relname, 'Row')}\n        }
        Relationships: []
      }`,
    )
    .join('\n')
  const functionBlocks = functions.rows
    .map((fn) => {
      // PostgreSQL non-strict functions receive SQL NULL arguments. In particular,
      // clearing a rating/note and creating a collection intentionally use NULL.
      const args = fn.argument_types
        .map(
          (type, index) =>
            `${fn.proargnames[index]}${index >= fn.argument_types.length - fn.pronargdefaults ? '?' : ''}: ${typeName(type)}${!fn.proisstrict && !['json', 'jsonb'].includes(type) ? ' | null' : ''}`,
        )
        .join('; ')
      return `      ${fn.proname}: { Args: ${args ? `{ ${args} }` : 'Record<PropertyKey, never>'}; Returns: ${typeName(fn.return_type)} }`
    })
    .join('\n')
  const enumBlocks = enums.rows
    .map(
      (row) =>
        `      ${row.typname}: ${row.labels.map((label) => `'${label}'`).join(' | ')}`,
    )
    .join('\n')
  const content = `// Generated from applied PostgreSQL migrations by npm run db:types.
// Source: supabase/generate-types.mjs (PGlite catalog introspection).
// For a linked live Supabase project: npx supabase gen types typescript --linked.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = {
  public: {
    Tables: {
${tableBlocks}
    }
    Views: {
${viewBlocks}
    }
    Functions: {
${functionBlocks}
    }
    Enums: {
${enumBlocks}
    }
    CompositeTypes: Record<PropertyKey, never>
  }
}
`
  const outputPath = fileURLToPath(
    new URL('../src/types/database.ts', import.meta.url),
  )
  const prettierOptions = await resolveConfig(outputPath)
  await writeFile(
    outputPath,
    await format(content, { ...prettierOptions, filepath: outputPath }),
  )
  process.stdout.write(
    `Generated database types from ${relations.rows.length} relations and ${functions.rows.length} functions.\n`,
  )
} finally {
  await db.close()
}
