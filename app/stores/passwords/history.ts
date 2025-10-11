import { eq } from "drizzle-orm";
import { haexPasswordsItemHistory } from "~/database/schemas";

export const usePasswordHistoryStore = defineStore(
  "passwordHistoryStore",
  () => {
    return { getAsync };
  }
);

const getAsync = async (itemId: string | null) => {
  if (!itemId) return null;

  try {
    const { currentVault } = useVaultStore();

    const history = await currentVault?.drizzle
      ?.select()
      .from(haexPasswordsItemHistory)
      .where(eq(haexPasswordsItemHistory.itemId, itemId));

    console.log("found history ", history);
    return history;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
