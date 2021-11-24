import { SEPERATOR } from "./types";
export class Entry {
    graph;
    parent;
    key;
    state;
    constructor(graph, parent, key, state) {
        this.graph = graph;
        this.parent = parent;
        this.key = key;
        this.state = state;
    }
    getValue() {
        return this.graph.getValueAtPath(this.getPath());
    }
    getPath() {
        return this.parent
            ? this.parent.getPath() + SEPERATOR + this.key
            : this.key;
    }
    toJSON() {
        return {
            state: this.state,
        };
    }
}
