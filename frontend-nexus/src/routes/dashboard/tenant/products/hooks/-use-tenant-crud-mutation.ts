import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useDialogStore } from "@/stores/use-dialog-store";
import { getErrorMessage } from "../../utils";

interface UseTenantCrudMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage: string;
  errorTitle: string;
  invalidateQueryKeys?: readonly QueryKey[];
  closeDialogOnSuccess?: boolean;
  afterSuccess?: () => void;
}

export function useTenantCrudMutation<TData, TVariables>(
  options: UseTenantCrudMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const closeDialog = useDialogStore((state) => state.close);

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: () => {
      toast.success(options.successMessage);
      if (options.closeDialogOnSuccess !== false) {
        closeDialog();
      }
      for (const queryKey of options.invalidateQueryKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey });
      }
      options.afterSuccess?.();
    },
    onError: (err) => {
      toast.error(options.errorTitle, {
        description: getErrorMessage(err),
      });
    },
  });
}
