import { createContext, useContext } from 'react';

export const UserContext = createContext({ user: null, isAdmin: false });

export function useUser() {
  return useContext(UserContext);
}