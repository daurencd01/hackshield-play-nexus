import { useQuery } from '@tanstack/react-query';
import { userProfileService } from '@/services/userProfileService';

export function usePublicProfile(idOrUsername: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'public', idOrUsername],
    queryFn: () => userProfileService.getPublicProfile(idOrUsername!),
    enabled: !!idOrUsername,
    staleTime: 1000 * 60 * 2 // 2 minutes
  });
}

export function useUserAchievements(userId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['profile', 'achievements', userId, limit],
    queryFn: () => userProfileService.getUserAchievements(userId!, limit),
    enabled: !!userId
  });
}

export function useRecentMissions(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['profile', 'missions', userId, limit],
    queryFn: () => userProfileService.getRecentMissions(userId!, limit),
    enabled: !!userId
  });
}
