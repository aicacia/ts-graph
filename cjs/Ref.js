"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ref = void 0;
const types_1 = require("./types");
class Ref {
    constructor(graph, path, state) {
        this.graph = graph;
        this.path = path;
        this.state = state;
        this.waitMS = graph.getWaitMS();
    }
    get(key) {
        return new Ref(this.graph, this.path + types_1.SEPERATOR + key, this.state);
    }
    set(value) {
        this.graph.set(this.path, value);
        return this;
    }
    getValue() {
        return this.graph.getValueAtPath(this.path);
    }
    getPath() {
        return this.path;
    }
    getNode() {
        return this.graph.getNodeAtPath(this.path);
    }
    getState() {
        return this.state;
    }
    on(callback) {
        let currentNode = this.getNode();
        const onChange = (path) => {
            const node = this.getNode();
            if (node) {
                const value = node.getValue();
                if (currentNode !== node) {
                    this.graph.listenAtPath(node.getPath(), value === undefined);
                    currentNode = node;
                }
                if (path.startsWith(node.getPath())) {
                    callback(value);
                }
            }
            else {
                currentNode = node;
            }
        };
        this.graph.on("change", onChange);
        const value = currentNode === null || currentNode === void 0 ? void 0 : currentNode.getValue();
        this.graph.listenAtPath((currentNode === null || currentNode === void 0 ? void 0 : currentNode.getPath()) || this.path, value === undefined);
        if (value !== undefined) {
            callback(value);
        }
        return () => {
            this.graph.off("change", onChange);
        };
    }
    getWaitMS() {
        return this.waitMS;
    }
    setWaitMS(waitMS) {
        this.waitMS = waitMS;
        return this;
    }
    then(onfulfilled, onrejected) {
        const value = this.getValue();
        let promise;
        if (value !== undefined) {
            promise = Promise.resolve(value);
        }
        else {
            promise = new Promise((resolve, reject) => {
                let resolved = false;
                const off = this.on((value) => {
                    resolved = true;
                    off();
                    resolve(value);
                });
                setTimeout(() => {
                    if (!resolved) {
                        reject(new Error(`Request took longer than ${this.waitMS}ms to resolve`));
                        off();
                    }
                }, this.waitMS);
            });
        }
        return promise.then(onfulfilled, onrejected);
    }
    toJSON() {
        return {
            id: this.path,
            state: this.state,
        };
    }
}
exports.Ref = Ref;
