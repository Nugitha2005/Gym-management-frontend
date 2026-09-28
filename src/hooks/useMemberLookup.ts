import { useCallback, useState } from "react";
import { ApiError, errorMessage } from "../api/client";
import { usersApi } from "../api/endpoints";
import type { User } from "../api/types";

/**
 * Find a member by the University ID printed on their card (GET /api/users/lookup).
 * Returns the user, or null with `error` set ("No member found…").
 */
export function useMemberLookup() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (universityId: string): Promise<User | null> => {
    const id = universityId.trim();
    if (!id) {
      setError("Type the member's University ID.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      return await usersApi.lookup(id);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? `Nobody is registered with ID ${id.toUpperCase()}.` : errorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, error, setError, loading };
}
