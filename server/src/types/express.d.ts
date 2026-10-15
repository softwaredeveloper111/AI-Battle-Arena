declare global {
  namespace Express {
    interface User {
      _id?: any;
      id?: any;
      username?: string;
      email?: string;
      emailVerified?: boolean;
      [key: string]: any;
    }
  }
}

export {};
