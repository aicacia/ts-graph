import type { Ref } from "./Ref";

export type IKeyOf<T> = Exclude<keyof T, symbol | number>;
export type IValueOf<T> = Extract<T, IPrimitive>;

export type IPrimitive = string | number | boolean | null;

export type IGraph = { [key: string]: IGraphValue };
export type IGraphValue = IPrimitive | Ref | IGraph;

export type IRefValueChild<T extends IGraphValue> = T extends IGraph
  ? Ref<T>
  : T extends Ref<infer V>
  ? Ref<V>
  : T;

export type IRefValue<T extends IGraphValue> = T extends IGraph
  ? { [K in IKeyOf<T>]: IRefValueChild<T[K]> }
  : T extends Ref<infer V>
  ? V
  : T;

export const SEPERATOR = "/";
