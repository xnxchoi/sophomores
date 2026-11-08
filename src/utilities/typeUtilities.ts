// export type LimitDepth<
//   T,
//   Limit extends number = 1,
//   Current extends number = 0
// > = Current extends Limit
//   ? T extends Array<infer I>
//     ? LimitDepth<I, Limit, Current>
//     : T extends TypeWithID | string
//       ? string
//       : never
//   : {
//       [K in RequiredKeys<T>]: T[K] extends object
//         ? LimitDepth<T[K], Limit, Increment<Current>>
//         : T[K];
//     } & {
//       [K in OptionalKeys<T>]?: T[K] extends object
//         ? LimitDepth<T[K], Limit, Increment<Current>>
//         : T[K];
//     };
// type AA<T> = T extends object ? LimitDepth<T, 1> : T;
// type A = LimitDepth<User["profile"], 1>;
export type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];
type Length<T extends any[]> = (T extends { length: number }
  ? T["length"]
  : never) &
  number;

/**
 * Array, Tuples
 */
export type TupleOf<N extends number, T extends unknown[] = []> =
  Length<T> extends N ? T : TupleOf<N, [...T, unknown]>;
export type Pop<T extends any[]> = T extends [...infer U, unknown] ? U : never;

// add an element to the end of a tuple
type Push<L extends any[], T> = ((r: any, ...x: L) => void) extends (
  ...x: infer L2
) => void
  ? { [K in keyof L2]-?: K extends keyof L ? L[K] : T }
  : never;

// Increment adds an element to a tuple, effectively creating N + 1
export type Increment<N extends number> = Length<[1, ...TupleOf<N>]>;

// Decrement removes an element from a tuple, effectively creating N - 1
export type Decrement<N extends number> = Length<Pop<TupleOf<N>>>;

export type RequiredFields<T> = Pick<T, RequiredKeys<T>>;
/**
 * Strings
 */
export type Concat<T extends string[]> = T extends [
  infer F extends string,
  ...infer R extends string[]
]
  ? `${F}${Concat<R>}`
  : "";

/**
 * Keys extraction
 */

export type KeysOfValue<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition ? K : never;
}[keyof T];
type FixArr<T> = T extends readonly any[] ? Omit<T, keyof any[] | number> : T;
type DropInitDot<T> = T extends `.${infer U}` ? U : T;
export type DeepKeys<
  T,
  Limit extends number = 1,
  Current extends number = 0
> = T extends object
  ? Current extends Limit
    ? {
        [K in keyof T & string]: `${`.${K}`}${""}`;
      }[keyof T & string]
    : Current extends 0
      ? {
          [K in keyof T &
            string]: `${K}${"" | DeepKeys<FixArr<T[K]>, Limit, Increment<Current>>}`;
        }[keyof T & string]
      : {
          [K in keyof T &
            string]: `${`.${K}`}${"" | DeepKeys<FixArr<T[K]>, Limit, Increment<Current>>}`;
        }[keyof T & string]
  : never;

export function join<T extends string[]>(...strings: T): Concat<T> {
  return strings.join("") as Concat<T>;
}

export type Prepend<Tuple extends any[], Addend> = ((
  _: Addend,
  ..._1: Tuple
) => any) extends (..._: infer Result) => any
  ? Result
  : never;
//
export type Reverse<Tuple extends any[], Prefix extends any[] = []> = {
  0: Prefix;
  1: ((..._: Tuple) => any) extends (_: infer First, ..._1: infer Next) => any
    ? Reverse<Next, Prepend<Prefix, First>>
    : never;
}[Tuple extends [any, ...any[]] ? 1 : 0];

/**
 * Unions & Intersections
 */

// convert a union to an intersection: X | Y | Z ==> X & Y & Z
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// convert a union to an overloaded function X | Y ==> ((x: X)=>void) & ((y:Y)=>void)
type UnionToOvlds<U> = UnionToIntersection<
  U extends any ? (f: U) => void : never
>;

// returns true if the type is a union otherwise false
type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

// takes last from union
type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never;

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

export type RequiredOnly<T> = Pick<T, RequiredKeys<T>>;
export type ExcludeProperties<Type, Att extends keyof Type> = {
  [Property in keyof Type as Exclude<Property, Att>]: Type[Property];
};
export type RequireByKeys<Type, T extends keyof Type> = Required<
  Pick<Type, T>
> &
  Omit<Type, T>;
export type RequireKeysAndRestOptional<Type, T extends keyof Type> = Required<
  Pick<Type, T>
> &
  Partial<Omit<Type, T>>;
export type MakeRequired<Type> = Required<
  Pick<Type, RequiredKeys<Type> | OptionalKeys<Type>>
>;
type Arb = {
  a?: string;
  b: string | null;
  c?: null | number;
};

export type MakeNonNullable<T> = { [P in keyof T]: NonNullable<T[P]> };

export type RequiredAndNonNullable<T> = MakeRequired<MakeNonNullable<T>>;

type _Combine<
  T,
  K extends PropertyKey = T extends unknown ? keyof T : never
> = T extends unknown ? T & Partial<Record<Exclude<K, keyof T>, never>> : never;

export type Combine<T> = { [K in keyof _Combine<T>]: _Combine<T>[K] };
export type Without<T> = { [P in keyof T]?: undefined };
export type XOR<T, U> = (Without<T> & U) | (Without<U> & T);

// Helper type to generate all permutations of the union as tuples
export type Permutation<T, U = T> = [T] extends [never]
  ? []
  : T extends U
    ? [T, ...Permutation<Exclude<U, T>>]
    : never;
// Helper type to create all non-empty subsets from the permutations
export type NonEmptySubsets<
  T extends any[],
  Acc extends any[] = []
> = T extends [infer First, ...infer Rest]
  ?
      | [First, ...Acc]
      | NonEmptySubsets<Rest, [First, ...Acc]>
      | NonEmptySubsets<Rest, Acc>
  : Acc extends []
    ? never
    : Acc;
export type InsertAtAllPositions<
  T extends any[],
  U,
  Acc extends any[] = []
> = T extends [infer Head, ...infer Tail]
  ? InsertAtAllPositions<Tail, U, [...Acc, Head]> | [...Acc, U, ...T]
  : [...Acc, U];
export type NestedKeysUnion<T> = T extends any
  ? {
      [K in keyof T & string]: T[K] extends object
        ? keyof T[K] & string
        : never;
    }[keyof T & string]
  : never;
export type KeysOfUnion<T> = T extends object ? keyof T : never;
