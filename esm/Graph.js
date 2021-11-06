import { EventEmitter } from "eventemitter3";
export const SEPERATOR = "/";
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
export class Node extends Entry {
    children = new Map();
    getValue() {
        return getValueAtPath([], this, new Map());
    }
    toNodesJSON() {
        return nodeMapToJSON(this.children, {}, this.getPath(), false);
    }
    toJSON() {
        const children = {};
        for (const [key, child] of this.children) {
            if (child instanceof Node) {
                children[key] = { state: child.state, id: child.getPath() };
            }
            else {
                children[key] = child.toJSON();
            }
        }
        return {
            state: this.state,
            children,
        };
    }
}
export class Edge extends Entry {
    value;
    constructor(graph, parent, key, state, value) {
        super(graph, parent, key, state);
        this.state = state;
        this.value = value;
    }
    getValue() {
        return getValueAtPath([], this, new Map());
    }
    toJSON() {
        return this.value instanceof Ref
            ? this.value.toJSON()
            : { state: this.state, value: this.value };
    }
}
export class Ref {
    graph;
    path;
    state;
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
        const node = this.getNode();
        const onChange = (path) => {
            if (path.startsWith(node?.getPath() || this.path)) {
                callback(this.getValue());
            }
        };
        this.graph.listenTo(node ? node.getPath() : this.path);
        this.graph.on("change", onChange);
        const value = getValueAtPath([], node, new Map());
        if (value !== undefined) {
            callback(value);
        }
        return () => {
            this.graph.off("change", onChange);
        };
    }
    then(onfulfilled, onrejected) {
        const node = this.getNode(), value = getValueAtPath([], node, new Map());
        let promise;
        if (value !== undefined) {
            if (value instanceof Ref) {
                promise = value.then();
            }
            else {
                promise = Promise.resolve(value);
            }
        }
        else {
            this.graph.listenTo(node ? node.getPath() : this.path);
            promise = new Promise((resolve) => {
                const onChange = (path) => {
                    if (path.startsWith(this.path)) {
                        resolve(this.getValue());
                    }
                };
                this.graph.once("change", onChange);
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
export class Graph extends EventEmitter {
    listening = new Set();
    state = Date.now();
    entries = new Map();
    getEntries() {
        return this.entries;
    }
    get(key) {
        return new Ref(this, key, this.state);
    }
    getValueAtPath(path) {
        const keys = path.split(SEPERATOR), node = this.entries.get(keys.shift());
        if (node) {
            return getValueAtPath(keys, node, new Map());
        }
        else {
            this.listenTo(path);
            return undefined;
        }
    }
    getNodeAtPath(path) {
        const keys = path.split(SEPERATOR), node = this.entries.get(keys.shift());
        return getNodeAtPath(keys, node);
    }
    set(path, value) {
        this.state = Date.now();
        this.setPathInternal(path, value, this.state);
        return this;
    }
    merge(path, json) {
        if (this.isListeningTo(path)) {
            this.mergePathInternal(path, json);
        }
        return this;
    }
    listenTo(path) {
        this.listening.add(path);
        this.emit("get", path);
        return this;
    }
    isListeningTo(path) {
        for (const listeningPath of this.listening) {
            if (path.startsWith(listeningPath)) {
                return true;
            }
        }
        return false;
    }
    toJSON() {
        return nodeMapToJSON(this.entries, {}, undefined, true);
    }
    mergePathInternal(path, json) {
        const jsonState = json.state;
        let node = this.getNodeAtPath(path);
        if ("children" in json) {
            if (node instanceof Edge) {
                if ((node.value instanceof Ref &&
                    node.value.getPath() === path &&
                    node.value.getState() >= jsonState) ||
                    shouldOverwrite(node.value, node.state, new Ref(this, path, jsonState), jsonState)) {
                    node = this.createNodeAt(path, jsonState);
                }
            }
            else if (!node) {
                node = this.createNodeAt(path, jsonState);
            }
            if (node instanceof Node) {
                for (const [key, child] of Object.entries(json.children)) {
                    this.mergePathInternal(node.getPath() + SEPERATOR + key, child);
                }
                this.emit("change", node.getPath(), node.toJSON());
            }
        }
        else {
            const jsonValue = "value" in json ? json.value : new Ref(this, json.id, jsonState);
            if (node instanceof Edge) {
                if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
                    node.value = jsonValue;
                    node.state = jsonState;
                    this.emit("change", node.getPath(), node.toJSON());
                }
            }
            else if (node instanceof Node) {
                if (shouldOverwrite(new Ref(this, node.getPath(), jsonState), node.state, jsonValue, jsonState)) {
                    const newNode = this.createEdgeAt(path, jsonState);
                    newNode.value = jsonValue;
                    this.emit("change", newNode.getPath(), newNode.toJSON());
                }
            }
            else {
                const newNode = this.createEdgeAt(path, jsonState);
                newNode.value = jsonValue;
                this.emit("change", newNode.getPath(), newNode.toJSON());
            }
        }
        return this;
    }
    setPathInternal(path, value, state) {
        if (value instanceof Ref) {
            this.setEdgePathInternal(path, value, state);
        }
        else if (value != null && typeof value === "object") {
            for (const [k, v] of Object.entries(value)) {
                this.setPathInternal(path + SEPERATOR + k, v, state);
            }
        }
        else {
            this.setEdgePathInternal(path, value, state);
        }
    }
    setEdgePathInternal(path, value, state) {
        const edge = this.createEdgeAt(path, state);
        edge.value = value;
        const edgePath = edge.getPath(), edgeJSON = edge.toJSON();
        this.emit("change", edgePath, edgeJSON);
        this.emit("set", edgePath, edgeJSON);
        return edge;
    }
    createNodeAt(path, state) {
        const keys = path.split(SEPERATOR), key = keys.shift();
        let parent = this.entries.get(key);
        if (!(parent instanceof Node)) {
            parent = new Node(this, null, key, state);
            this.entries.set(key, parent);
        }
        return keys.reduce((parent, key) => {
            const node = parent.children.get(key);
            if (node instanceof Node) {
                return node;
            }
            else if (node instanceof Edge) {
                if (node.value instanceof Ref) {
                    const refNode = node.value.getNode();
                    if (refNode instanceof Node) {
                        return refNode;
                    }
                }
            }
            const newNode = new Node(this, parent, key, state);
            parent.children.set(key, newNode);
            return newNode;
        }, parent);
    }
    createEdgeAt(path, state) {
        const [parentPath, key] = getParentPathAndKey(path), parent = parentPath ? this.createNodeAt(parentPath, state) : null;
        let node = parent?.children.get(key);
        if (node instanceof Edge) {
            node.state = state;
            return node;
        }
        else {
            node = new Edge(this, parent, key, state, null);
            if (parent) {
                parent?.children.set(key, node);
            }
            else {
                this.entries.set(key, node);
            }
            return node;
        }
    }
}
export function getParentPath(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return undefined;
    }
    else {
        return path.substring(index + 1);
    }
}
export function getParentPathAndKey(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return [undefined, path];
    }
    else {
        return [path.substring(0, index), path.substring(index + 1)];
    }
}
function getValueAtPath(keys, node, values) {
    if (!node) {
        return undefined;
    }
    const seen = values.get(node);
    if (seen) {
        return seen;
    }
    if (node instanceof Node) {
        const key = keys.shift();
        if (key) {
            const child = node.children.get(key);
            if (child) {
                return getValueAtPath(keys, child, values);
            }
            else {
                node.graph.listenTo(node.getPath() + SEPERATOR + key);
                values.set(node, undefined);
                return undefined;
            }
        }
        else {
            const children = {};
            values.set(node, children);
            for (const [k, c] of node.children) {
                const childPath = node.getPath() + SEPERATOR + k;
                if (c instanceof Edge &&
                    c.value instanceof Ref &&
                    c.getPath() === childPath) {
                    children[k] = new Ref(node.graph, childPath, c.state);
                }
                else {
                    const value = getValueAtPath(keys, c, values);
                    if (value !== undefined) {
                        children[k] = value;
                    }
                    else {
                        children[k] = new Ref(node.graph, childPath, c.state);
                    }
                }
            }
            return children;
        }
    }
    else if (node.value instanceof Ref) {
        if (node.getPath() === node.value.getPath()) {
            node.graph.listenTo(node.value.getPath());
            values.set(node, undefined);
            return undefined;
        }
        const refNode = node.value.getNode();
        if (refNode) {
            return getValueAtPath(keys, refNode, values);
        }
        else {
            node.graph.listenTo(node.value.getPath());
            values.set(node, undefined);
            return undefined;
        }
    }
    values.set(node, node.value);
    return node.value;
}
function getNodeAtPath(keys, node) {
    if (!node) {
        return undefined;
    }
    else if (node instanceof Node) {
        const key = keys.shift();
        if (key) {
            const child = node.children.get(key);
            if (child) {
                return getNodeAtPath(keys, child);
            }
            else {
                return undefined;
            }
        }
        else {
            return node;
        }
    }
    else if (node.value instanceof Ref) {
        if (node.getPath() === node.value.getPath()) {
            return node;
        }
        const refNode = node.value.getNode();
        if (refNode) {
            return getNodeAtPath(keys, refNode);
        }
        else {
            return undefined;
        }
    }
    return node;
}
function shouldOverwrite(localValue, localState, remoteValue, remoteState) {
    return (remoteState >= localState &&
        (localState === remoteState
            ? JSON.stringify(remoteValue) > JSON.stringify(localValue)
            : true));
}
function nodeMapToJSON(entries, json, path, recur = false) {
    const prefix = path ? path + SEPERATOR : "";
    entries.forEach((child, key) => {
        if (child instanceof Node) {
            if (recur) {
                nodeMapToJSON(child.children, json, prefix + key, recur);
            }
            else {
                json[prefix + key] = child.toJSON();
            }
        }
        else {
            json[prefix + key] = child.toJSON();
        }
    });
    return json;
}
