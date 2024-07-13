// type OptionalData<Types, T> = { data?: T } & (IsNever<Types> extends false
//   ? Types extends string
//     ? {
//         [P in Types]?: T;
//       }
//     : {}
//   : {});

export type Data<Types, T> = T extends undefined
  ? OptionalData<Types, T>
  : RequiredData<Types, T>;

export type RequiredData<Types, T> =
  | { data: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]: T }
        : never
      : never);

export type OptionalData<Types, T> =
  | { data?: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]?: T }
        : never
      : never);
