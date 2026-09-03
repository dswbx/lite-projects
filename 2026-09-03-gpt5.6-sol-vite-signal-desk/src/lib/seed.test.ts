import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const seedSql = readFileSync(join(projectRoot, 'supabase', 'seed.sql'), 'utf8')
const migrationFiles = readdirSync(join(projectRoot, 'supabase', 'migrations')).filter((name) => name.endsWith('.sql')).sort()

describe('deterministic database fixture', () => {
  it('locks the exact 26-file forward migration chain and 38-table contract', () => {
    expect(migrationFiles).toHaveLength(26)
    expect(migrationFiles[0]).toBe('20260903120000_workspaces.sql')
    expect(migrationFiles.at(-1)).toBe('20260903122500_performance_indexes.sql')

    const tableNames = new Set(migrationFiles.flatMap((name) => {
      const sql = readFileSync(join(projectRoot, 'supabase', 'migrations', name), 'utf8')
      return [...sql.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1])
    }))
    expect(tableNames.size).toBe(38)
  })

  it('has a stable seed artifact with no runtime randomness or clock dependency', () => {
    expect(seedSql).not.toMatch(/\brandom\s*\(|\bcurrent_(?:date|time|timestamp)\b|\bnow\s*\(/i)
    expect(seedSql).toContain('with recursive n(i)')
    expect(createHash('sha256').update(seedSql).digest('hex')).toBe('72c7736d564199016159509622c297aceae946b1b554fc3def3b6e172629518b')
  })
})
