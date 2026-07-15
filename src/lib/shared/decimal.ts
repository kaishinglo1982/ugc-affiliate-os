/**
 * Shared numeric type. The project stores all money and ratios as Prisma
 * `Decimal` in the database; this module exposes that type from the generated
 * client so domain/infrastructure layers can use it without importing Prisma
 * internals directly. `shared` is an explicitly allowed cross-cutting layer.
 */
import { Prisma } from "@/generated/prisma/client";

const DecimalClass = Prisma.Decimal;

/** Project-wide decimal type (Prisma's high-precision Decimal). Usable as both
 *  a value (constructor) and a type (instance). */
export const Decimal = DecimalClass;
export type Decimal = InstanceType<typeof DecimalClass>;
export type DecimalValue = ConstructorParameters<typeof DecimalClass>[0];
