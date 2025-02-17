export type UserRole = 'admin' | 'manager' | 'accountant' | 'salesperson';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}
