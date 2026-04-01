"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types/health";
import { toast } from "sonner";

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, blood_type, date_of_birth, created_at, updated_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
    staleTime: 300000, 
    gcTime: 600000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: ["profile", user?.id] });
      const previousProfile = queryClient.getQueryData(["profile", user?.id]);
      queryClient.setQueryData(["profile", user?.id], (old: Profile | undefined) => ({
        ...old,
        ...newProfile,
      }));
      return { previousProfile };
    },
    onError: (err, newProfile, context) => {
      queryClient.setQueryData(["profile", user?.id], context?.previousProfile);
      toast.error(`Failed to update profile: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};
