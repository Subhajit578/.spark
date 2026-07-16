import { z } from "zod"
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const DATABASE_URL = process.env.DATABASE_URL as string;

export const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(3).max(10)
})