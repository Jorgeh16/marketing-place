import axios from 'axios'
import { api } from './axios'
import type { User } from '../types/nft'

export const sessionQueryKey = ['session'] as const

export async function getSession(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/session')
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null
    throw error
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data.message ?? fallback
  }
  return fallback
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
