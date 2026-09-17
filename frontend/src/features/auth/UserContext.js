import { createContext, useContext } from 'react';

export const UserContext = createContext({ user: null, isAdmin: false, isSuperAdmin: false });

export function useUser() {
  return useContext(UserContext);
}