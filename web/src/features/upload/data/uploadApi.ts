import { useMutation } from '@tanstack/react-query'
import { apiUpload } from '../../shared/libs/api'

export interface UploadFileResponse {
  url: string
  publicId: string
  originalName: string
  size: number
}

export function useUploadSingleFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiUpload<UploadFileResponse>('/api/upload/single', formData)
    },
  })
}

export function useUploadMultipleFiles() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const res = await apiUpload<{ files: UploadFileResponse[] }>('/api/upload/multiple', formData)
      return res.files
    },
  })
}
