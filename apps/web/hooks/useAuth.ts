import { useMutation } from '@tanstack/react-query'
import { useAuthStore, type User } from '@/store/authStore'

export function useUpdateProfile() {
  const updateUser = useAuthStore(state => state.updateUser)
  return useMutation({
    mutationFn: async (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => {
      return updateUser(data)
    }
  })
}
