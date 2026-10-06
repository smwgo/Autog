import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      location: string;
      permissions: any;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    location: string;
    permissions: any;
  }
}
