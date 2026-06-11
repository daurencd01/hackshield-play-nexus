import { useQuery } from '@tanstack/react-query';
import { friendsService } from '@/services/friendsService';

export function useFriendshipStatus(otherUserId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['friendship', otherUserId],
    queryFn: async () => {
      if (!otherUserId) return 'none';
      const status = await friendsService.getFriendshipStatus(otherUserId);
      return status;
    },
    enabled: !!otherUserId,
    staleTime: 1000 * 30 // 30 seconds
  });

  return data || 'none';
}
