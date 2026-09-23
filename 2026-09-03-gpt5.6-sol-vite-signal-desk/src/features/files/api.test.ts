import { describe, expect, it } from "vitest"
import { MAX_FILE_BYTES, validateUpload } from "./api"

describe("validateUpload", () => {
  it("accepts the documented file types within the limit", () => {
    expect(validateUpload({ name: "proposal.pdf", size: MAX_FILE_BYTES, type: "application/pdf" })).toEqual({ ok: true, data: undefined })
  })

  it("rejects oversized and unsupported files", () => {
    const oversized = validateUpload({ name: "large.csv", size: MAX_FILE_BYTES + 1, type: "text/csv" })
    const unsupported = validateUpload({ name: "script.js", size: 20, type: "text/javascript" })
    expect(oversized.ok && unsupported.ok).toBe(false)
    if (!oversized.ok) expect(oversized.error.message).toContain("10 MiB")
    if (!unsupported.ok) expect(unsupported.error.code).toBe("validation")
  })
})
