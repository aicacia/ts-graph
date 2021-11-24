import type { Ref } from "./Ref";
export declare type IKeyOf<T> = Exclude<keyof T, symbol | number>;
export declare type IValueOf<T> = Extract<T, IPrimitive>;
export declare type IPrimitive = string | number | boolean | null;
export declare type IGraph = {
    [S in string]: IGraphValue;
} & {
    [S in number]: IGraphValue;
};
export declare type IGraphValue = IPrimitive | Ref | IGraph;
export declare type IRefValueChild<T extends IGraphValue> = T extends IGraph ? Ref<T> : T extends Ref<infer V> ? Ref<V> : T;
export declare type IRefValue<T extends IGraphValue> = T extends IGraph ? {
    [K in IKeyOf<T>]: IRefValueChild<T[K]>;
} : T extends Ref<infer V> ? V : T;
export declare const SEPERATOR = "/";
