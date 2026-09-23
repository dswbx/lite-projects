import { useQuery } from '@tanstack/react-query'
import { CRM_FILES_BUCKET } from '@/features/files/api'
import { supabase, usesExternalSupabase } from '@/lib/supabase'

export type ProfileView = {
  id: string
  email: string
  full_name: string
  job_title: string | null
  avatar_url: string | null
  avatarSrc: string | null
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<ProfileView> => {
      const { data, error } = await supabase.from('profiles').select('id,email,full_name,job_title,avatar_url').eq('id', userId).single()
      if (error || !data) throw error ?? new Error('Profile not found')
      let avatarSrc: string | null = null
      if (data.avatar_url) {
        if (usesExternalSupabase) {
          const signed = await supabase.storage.from(CRM_FILES_BUCKET).createSignedUrl(data.avatar_url, 60 * 60)
          if (!signed.error && signed.data) avatarSrc = signed.data.signedUrl
        } else {
          avatarSrc = localStorage.getItem(avatarCacheKey(data.avatar_url))
        }
      }
      return { ...data, avatarSrc }
    },
  })
}

export function avatarCacheKey(path: string) { return `signal-desk-avatar:${path}` }
