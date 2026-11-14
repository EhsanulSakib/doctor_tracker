import { hashPassword } from './password.js';
import { UserModel, toPublicUser, type PublicUser } from './user.model.js';

type AdminInput = { name: string; email: string; password: string };

/**
 * Creates the admin account, or resets its name and password if it already exists,
 * so the credentials in .env always work after seeding.
 */
export async function seedAdmin({ name, email, password }: AdminInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(password);

  const user = await UserModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { name, passwordHash, role: 'admin' } },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  return toPublicUser(user);
}
