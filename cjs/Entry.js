"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = void 0;
const types_1 = require("./types");
class Entry {
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
            ? this.parent.getPath() + types_1.SEPERATOR + this.key
            : this.key;
    }
    toJSON() {
        return {
            state: this.state,
        };
    }
}
exports.Entry = Entry;
