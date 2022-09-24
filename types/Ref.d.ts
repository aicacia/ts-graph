import type { Graph } from "./Graph";
import type { IEntryJSON } from "./Entry";
import { IGraph, IGraphValue, IKeyOf, IRefValue, IValueOf } from "./types";
export interface IRefJSON extends IEntryJSON {
    id: string;
}
export declare class Ref<T extends IGraphValue = IGraphValue> implements PromiseLike<IRefValue<T> | undefined> {
    protected graph: Graph;
    protected path: string;
    protected state: number;
    protected waitMS: number | undefined;
    constructor(graph: Graph, path: string, state: number);
    get<SK extends IKeyOf<T> = IKeyOf<T>>(key: SK): Ref<T[SK] extends IGraph ? T[SK] : T[SK] extends Ref<infer V> ? V : IValueOf<T[SK]>>;
    set(value: T | Ref<T>): this;
    delete(): this;
    getValue(): IRefValue<T> | undefined;
    getPath(): string;
    getNode(): import("./Node").Node | import("./Edge").Edge | undefined;
    getState(): number;
    on(callback: (value: IRefValue<T> | undefined) => void): () => void;
    once(callback: (value: IRefValue<T> | undefined) => void): this;
    getWaitMS(): number;
    setWaitMS(waitMS: number): this;
    then<R = IRefValue<T> | undefined, E = never>(onfulfilled?: ((value: IRefValue<T> | undefined) => R | PromiseLike<R>) | undefined | null, onrejected?: ((reason: any) => E | PromiseLike<E>) | undefined | null): Promise<R | E>;
    toJSON(): IRefJSON;
}
