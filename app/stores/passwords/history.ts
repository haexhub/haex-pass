import { eq } from "drizzle-orm";
import { haexPasswordsItemHistory } from "~/database";

export const usePasswordHistoryStore = defineStore(
  "passwordHistoryStore",
  () => {
    return { getAsync };
  }
);

const getAsync = async (itemId: string | null) => {
  if (!itemId) return null;

  try {
    const haexhubStore = useHaexHubStore();
    if (!haexhubStore.orm) throw new Error("Database not initialized");

    const history = await haexhubStore.orm
      .select()
      .from(haexPasswordsItemHistory)
      .where(eq(haexPasswordsItemHistory.itemId, itemId));

    console.log("found history ", history);
    return history;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
