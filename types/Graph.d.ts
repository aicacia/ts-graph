import { EventEmitter } from "eventemitter3";
import type { IEdgeJSON } from "./Edge";
import { Edge } from "./Edge";
import type { INodeJSON } from "./Node";
import { Node } from "./Node";
import type { IRefJSON } from "./Ref";
import { Ref } from "./Ref";
import type { IGraph, IGraphValue, IKeyOf, IRefValue } from "./types";
export interface IGraphEvents<T extends IGraph> {
    get(this: Graph<T>, path: string): void;
    set(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON): void;
    change(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON | INodeJSON): void;
}
export declare class Graph<T extends IGraph = IGraph> extends EventEmitter<IGraphEvents<T>> {
    protected state: number;
    protected entries: Map<string, Node | Edge>;
    protected listeningPaths: Set<string>;
    protected waitMS: number;
    setWaitMS(waitMS: number): this;
    getWaitMS(): number;
    getEntries(): ReadonlyMap<string, Node | Edge>;
    get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]>;
    getValueAtPath<V extends IGraphValue = IGraphValue>(path: string): IRefValue<V> | undefined;
    getNodeAtPath(path: string): Node | Edge | undefined;
    set(path: string, value: IGraphValue): this;
    merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON): this;
    listenAtPath(path: string, emit?: boolean): this;
    isListening(path: string): boolean;
    private mergePathInternal;
    private mergePathEdgeInternal;
    private setPathInternal;
    private setEdgePathInternal;
    private createNodeAt;
    private createEdgeAt;
}
export declare function getParentPathAndKey(path: string): [parentPath: string | undefined, key: string];
