import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import type { AttachmentTarget, FileLinkRecord, FileRecord, Result } from "@/lib/domain"
import { appError, fail, ok } from "@/lib/errors"
import { supabase } from "@/lib/supabase"

export const CRM_FILES_BUCKET = "crm-files"
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
  "text/plain",
])

export interface UploadFileInput extends AttachmentTarget {
  file: File
  actorId: string
}

export interface UploadFileResult {
  asset: FileRecord
  link: FileLinkRecord
}

export interface FileRepository {
  ensureBucket(): Promise<Result<void>>
  upload(input: UploadFileInput): Promise<Result<UploadFileResult>>
  download(workspaceId: string, assetId: string): Promise<Result<{ asset: FileRecord; blob: Blob }>>
  link(workspaceId: string, assetId: string, target: Omit<AttachmentTarget, "workspaceId">, actorId: string): Promise<Result<FileLinkRecord>>
  unlink(workspaceId: string, linkId: string): Promise<Result<void>>
  remove(workspaceId: string, assetId: string): Promise<Result<void>>
}

export function validateUpload(file: Pick<File, "name" | "size" | "type">): Result<void> {
  if (!file.name.trim()) return fail(appError("validation", "Choose a named file"))
  if (file.size <= 0) return fail(appError("validation", "The selected file is empty"))
  if (file.size > MAX_FILE_BYTES) return fail(appError("validation", "Files must be 10 MiB or smaller"))
  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    return fail(appError("validation", "Choose a PDF, PNG, JPEG, CSV, or plain-text file"))
  }
  return ok(undefined)
}

function safeFileName(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized || "file"
}

function storageFailure(error: unknown, message: string): Result<never> {
  return fail(appError("storage", message, error))
}

export function createFileRepository(client: SupabaseClient<Database> = supabase): FileRepository {
  return {
    async ensureBucket() {
      const { data, error } = await client.storage.getBucket(CRM_FILES_BUCKET)
      if (data) return ok(undefined)
      if (error && !error.message.toLowerCase().includes("not found")) return storageFailure(error, "Unable to inspect file storage")
      const created = await client.storage.createBucket(CRM_FILES_BUCKET, {
        public: false,
        fileSizeLimit: MAX_FILE_BYTES,
        allowedMimeTypes: [...ALLOWED_FILE_TYPES],
      })
      return created.error ? storageFailure(created.error, "Unable to create the private file bucket") : ok(undefined)
    },

    async upload(input) {
      const validation = validateUpload(input.file)
      if (!validation.ok) return validation

      const assetId = crypto.randomUUID()
      const linkId = crypto.randomUUID()
      const objectPath = `${input.workspaceId}/${input.actorId}/${input.entityType}/${input.entityId}/${assetId}-${safeFileName(input.file.name)}`
      const uploaded = await client.storage.from(CRM_FILES_BUCKET).upload(objectPath, await input.file.arrayBuffer(), {
        cacheControl: "3600",
        contentType: input.file.type,
        upsert: false,
      })
      if (uploaded.error) return storageFailure(uploaded.error, "The file could not be uploaded")

      const assetPayload = {
        id: assetId,
        workspace_id: input.workspaceId,
        created_by: input.actorId,
        created_by_status: "active",
        owner_id: input.actorId,
        storage_bucket: CRM_FILES_BUCKET,
        storage_path: uploaded.data.path,
        file_name: input.file.name,
        mime_type: input.file.type,
        size_bytes: input.file.size,
      }
      const assetResponse = await client.from("file_assets").insert(assetPayload).select("*").single()
      if (assetResponse.error || !assetResponse.data) {
        await client.storage.from(CRM_FILES_BUCKET).remove([uploaded.data.path])
        return fail(assetResponse.error ?? new Error("File metadata was not created"))
      }

      const linkPayload = {
        id: linkId,
        workspace_id: input.workspaceId,
        created_by: input.actorId,
        created_by_status: "active",
        file_asset_id: assetId,
        entity_type: input.entityType,
        entity_id: input.entityId,
      }
      const linkResponse = await client.from("file_links").insert(linkPayload).select("*").single()
      if (linkResponse.error || !linkResponse.data) {
        await client.from("file_assets").delete().eq("workspace_id", input.workspaceId).eq("id", assetId)
        await client.storage.from(CRM_FILES_BUCKET).remove([uploaded.data.path])
        return fail(linkResponse.error ?? new Error("File link was not created"))
      }
      return ok({ asset: assetResponse.data, link: linkResponse.data })
    },

    async download(workspaceId, assetId) {
      const assetResponse = await client.from("file_assets").select("*").eq("workspace_id", workspaceId).eq("id", assetId).single()
      if (assetResponse.error || !assetResponse.data) return fail(assetResponse.error ?? new Error("File not found"))
      const asset = assetResponse.data as FileRecord
      const downloaded = await client.storage.from(asset.storage_bucket).download(asset.storage_path)
      return downloaded.error || !downloaded.data
        ? storageFailure(downloaded.error, "The file could not be downloaded")
        : ok({ asset, blob: downloaded.data })
    },

    async link(workspaceId, assetId, target, actorId) {
      const response = await client.from("file_links").insert({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        created_by: actorId,
        created_by_status: "active",
        file_asset_id: assetId,
        entity_type: target.entityType,
        entity_id: target.entityId,
      }).select("*").single()
      return response.error || !response.data ? fail(response.error ?? new Error("File link was not created")) : ok(response.data)
    },

    async unlink(workspaceId, linkId) {
      const { error } = await client.from("file_links").delete().eq("workspace_id", workspaceId).eq("id", linkId)
      return error ? fail(error) : ok(undefined)
    },

    async remove(workspaceId, assetId) {
      const assetResponse = await client.from("file_assets").select("*").eq("workspace_id", workspaceId).eq("id", assetId).single()
      if (assetResponse.error || !assetResponse.data) return fail(assetResponse.error ?? new Error("File not found"))
      const asset = assetResponse.data as FileRecord
      const removed = await client.storage.from(asset.storage_bucket).remove([asset.storage_path])
      if (removed.error) return storageFailure(removed.error, "The stored object could not be removed")
      const links = await client.from("file_links").delete().eq("workspace_id", workspaceId).eq("file_asset_id", assetId)
      if (links.error) return fail(links.error)
      const deletedAsset = await client.from("file_assets").delete().eq("workspace_id", workspaceId).eq("id", assetId)
      return deletedAsset.error ? fail(deletedAsset.error) : ok(undefined)
    },
  }
}

export const fileRepository = createFileRepository()
