/**
 * ================================
 * Useful utility types that doesn't have anything to do with tRPC in particular
 * ================================
 */

/**
 * @public
 */
export type Maybe<TType> = TType | null | undefined;

/**
 * @internal
 * @link https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */
export type Simplify<TType> = TType extends any[] | Date
  ? TType
  : { [K in keyof TType]: TType[K] };

/**
 * @public
 */
export type Dict<TType> = Record<string, TType | undefined>;

/**
 * @public
 */
export type MaybePromise<TType> = Promise<TType> | TType;

export type FilterKeys<TObj extends object, TFilter> = {
  [TKey in keyof TObj]: TObj[TKey] extends TFilter ? TKey : never;
}[keyof TObj];

/**
 * @internal
 */
export type Filter<TObj extends object, TFilter> = Pick<
  TObj,
  FilterKeys<TObj, TFilter>
>;

/**
 * Unwrap return type if the type is a function (sync or async), else use the type as is
 * @internal
 */
export type Unwrap<TType> = TType extends (...args: any[]) => infer R
  ? Awaited<R>
  : TType;

/**
 * Makes the object recursively optional
 * @internal
 */
export type DeepPartial<TObject> = TObject extends object
  ? {
      [P in keyof TObject]?: DeepPartial<TObject[P]>;
    }
  : TObject;

/**
 * See https://github.com/microsoft/TypeScript/issues/41966#issuecomment-758187996
 * Fixes issues with iterating over keys of objects with index signatures.
 * Without this, iterations over keys of objects with index signatures will lose
 * type information about the keys and only the index signature will remain.
 * @internal
 */
export type WithoutIndexSignature<TObj> = {
  [K in keyof TObj as string extends K
    ? never
    : number extends K
      ? never
      : K]: TObj[K];
};

/**
 * @internal
 * Overwrite properties in `TType` with properties in `TWith`
 * Only overwrites properties when the type to be overwritten
 * is an object. Otherwise it will just use the type from `TWith`.
 */
export type Overwrite<TType, TWith> = TWith extends any
  ? TType extends object
    ? {
        [K in
          | keyof WithoutIndexSignature<TType>
          | keyof WithoutIndexSignature<TWith>]: K extends keyof TWith // Exclude index signature from keys
          ? TWith[K]
          : K extends keyof TType
            ? TType[K]
            : never;
      } & (string extends keyof TWith // Handle cases with an index signature
        ? { [key: string]: TWith[string] }
        : number extends keyof TWith
          ? { [key: number]: TWith[number] }
          : // eslint-disable-next-line @typescript-eslint/ban-types
            {})
    : TWith
  : never;

/**
 * @internal
 */
export type ValidateShape<TActualShape, TExpectedShape> =
  TActualShape extends TExpectedShape
    ? Exclude<keyof TActualShape, keyof TExpectedShape> extends never
      ? TActualShape
      : TExpectedShape
    : never;

/**
 * @internal
 */
export type PickFirstDefined<TType, TPick> = undefined extends TType
  ? undefined extends TPick
    ? never
    : TPick
  : TType;

export type DistributiveOmit<
  T,
  K extends string | number | symbol,
> = T extends any ? Omit<T, K> : never;

type FilterUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};
export type MarkOptionalToUndefined<T> = MarkOptional<
  T,
  keyof FilterUndefined<T>
>;

// ts-essentials https://github.com/ts-essentials/ts-essentials/
export type MarkOptional<Type, Keys extends keyof Type> = Type extends Type
  ? Omit<Type, Keys> & Partial<Pick<Type, Keys>>
  : never;

export type OptionalKeys<Type> = Type extends unknown
  ? {
      [Key in keyof Type]-?: undefined extends {
        [Key2 in keyof Type]: Key2;
      }[Key]
        ? Key
        : never;
    }[keyof Type]
  : never;

export type RequiredKeys<Type> = Type extends unknown
  ? Exclude<keyof Type, OptionalKeys<Type>>
  : never;

export type DistributiveIndex<T, K extends PropertyKey> = T extends Record<
  K,
  infer V
>
  ? V
  : never;

// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
export type IsAny<Type> = 0 extends 1 & Type ? true : false;

export type IsNever<Type> = [Type] extends [never] ? true : false;

export type Merge<Object1, Object2> = Omit<Object1, keyof Object2> & Object2;

export type MarkRequired<Type, Keys extends keyof Type> = Type extends Type
  ? Type & Required<Pick<Type, Keys>>
  : never;
