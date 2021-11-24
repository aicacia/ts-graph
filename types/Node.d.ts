import { Entry } from "./Entry";
import type { Edge, IEdgeJSON } from "./Edge";
import type { IEntryJSON } from "./Entry";
import type { IRefJSON } from "./Ref";
export interface INodeJSON extends IEntryJSON {
    children: {
        [key: string]: IEdgeJSON | IRefJSON;
    };
}
export declare class Node extends Entry {
    children: Map<string, Edge | Node>;
    toJSON(): INodeJSON;
}
