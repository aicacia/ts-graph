import { SEPERATOR, } from "./types";
export class Ref {
    graph;
    path;
    state;
    waitMS;
    constructor(graph, path, state) {
        this.graph = graph;
        this.path = path;
        this.state = state;
    }
    get(key) {
        return new Ref(this.graph, this.path + SEPERATOR + key, this.state);
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
        const value = currentNode?.getValue();
        this.graph.listenAtPath(currentNode?.getPath() || this.path, value === undefined);
        if (value !== undefined) {
            callback(value);
        }
        return () => {
            this.graph.off("change", onChange);
        };
    }
    once(callback) {
        const off = this.on((value) => {
            off();
            callback(value);
        });
        return this;
    }
    getWaitMS() {
        return this.waitMS === undefined ? this.graph.getWaitMS() : this.waitMS;
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
                const off = this.on((value) => {
                    clearTimeout(timeoutId);
                    off();
                    resolve(value);
                });
                const timeoutId = setTimeout(() => {
                    off();
                    reject(new Error(`Request took longer than ${this.getWaitMS()}ms to resolve`));
                }, this.getWaitMS());
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
