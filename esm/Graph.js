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
export class Node extends Entry {
    children = new Map();
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
            ...super.toJSON(),
            children,
        };
    }
}
export class Edge extends Entry {
    value;
    constructor(graph, parent, key, state, value) {
        super(graph, parent, key, state);
        this.value = value;
    }
    getPath() {
        return this.value instanceof Ref ? this.value.getPath() : super.getPath();
    }
    toJSON() {
        return this.value instanceof Ref
            ? this.value.toJSON()
            : {
                ...super.toJSON(),
                value: this.value,
            };
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
        const onChange = (path) => {
            const node = this.getNode();
            if (node && path.startsWith(node.getPath())) {
                callback(node.getValue());
            }
        };
        this.graph.on("change", onChange);
        const value = this.getValue();
        if (value !== undefined) {
            callback(value);
        }
        return () => {
            this.graph.off("change", onChange);
        };
    }
    then(onfulfilled, onrejected) {
        const value = this.getValue();
        let promise;
        if (value !== undefined) {
            promise = Promise.resolve(value);
        }
        else {
            promise = new Promise((resolve) => {
                const off = this.on((value) => {
                    off();
                    resolve(value);
                });
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
    state = Date.now();
    entries = new Map();
    listeningPaths = new Set();
    getEntries() {
        return this.entries;
    }
    get(key) {
        return new Ref(this, key, this.state);
    }
    getValueAtPath(path) {
        const node = this.getNodeAtPath(path);
        let value;
        if (node) {
            value = getValueAtNode(this, node);
            if (value === undefined) {
                this.listenAtPath(path);
            }
        }
        else {
            this.listenAtPath(path);
        }
        return value;
    }
    getNodeAtPath(path) {
        return getNodeAtPath(this, path, new Map());
    }
    set(path, value) {
        this.state = Date.now();
        this.setPathInternal(path, value, this.state);
        return this;
    }
    merge(path, json) {
        if (this.isListening(path)) {
            this.mergePathInternal(path, json);
        }
        return this;
    }
    listenAtPath(path) {
        this.emit("get", path);
        this.listeningPaths.add(path);
        return this;
    }
    isListening(path) {
        for (const listeningPath of this.listeningPaths) {
            if (path.startsWith(listeningPath)) {
                return true;
            }
        }
        return false;
    }
    mergePathInternal(path, json) {
        const jsonState = json.state;
        let node = this.getNodeAtPath(path);
        if ("children" in json) {
            if (node instanceof Edge) {
                if (shouldOverwrite(node.value, node.state, node.value, jsonState)) {
                    node = this.createNodeAt(path, jsonState);
                    this.emit("change", node.getPath(), node.toJSON());
                }
            }
            else if (!node) {
                node = this.createNodeAt(path, jsonState);
                this.emit("change", node.getPath(), node.toJSON());
            }
            if (node instanceof Node) {
                for (const [key, child] of Object.entries(json.children)) {
                    this.mergePathInternal(node.getPath() + SEPERATOR + key, child);
                }
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
        else if (value !== null && typeof value === "object") {
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
export function getParentPathAndKey(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return [undefined, path];
    }
    else {
        return [path.substring(0, index), path.substring(index + 1)];
    }
}
function getNodeAtPath(graph, path, nodes) {
    const seen = nodes.get(path);
    if (seen !== undefined) {
        return seen || undefined;
    }
    else {
        const keys = path.split(SEPERATOR), key = keys.shift(), node = graph.getEntries().get(key);
        if (node && keys.length) {
            nodes.set(key, node);
            return getNodeAtPathInternal(graph, key, node, keys, nodes);
        }
        else {
            return node;
        }
    }
}
function getNodeAtPathInternal(graph, path, node, keys, nodes = new Map()) {
    if (node instanceof Node) {
        const key = keys.shift();
        if (key) {
            const child = node.children.get(key), childPath = path + SEPERATOR + key;
            if (child) {
                nodes.set(childPath, child);
                return getNodeAtPathInternal(graph, childPath, child, keys, nodes);
            }
            else {
                nodes.set(childPath, null);
                return undefined;
            }
        }
        else {
            nodes.set(path, node);
            return node;
        }
    }
    else if (node.value instanceof Ref) {
        const refPath = node.value.getPath(), refNode = getNodeAtPath(graph, refPath, nodes);
        if (refNode && refNode !== node) {
            return getNodeAtPathInternal(graph, path, refNode, keys, nodes);
        }
        else {
            nodes.set(refPath, null);
            return undefined;
        }
    }
    else {
        nodes.set(path, node);
        return node;
    }
}
function getValueAtNode(graph, node, seen = new Set()) {
    if (!node) {
        return undefined;
    }
    else if (node instanceof Node) {
        const children = {};
        for (const [k, c] of node.children) {
            const childValue = c instanceof Edge
                ? c.value
                : (children[k] = new Ref(graph, c.getPath(), c.state));
            children[k] = childValue;
        }
        return children;
    }
    else if (node.value instanceof Ref) {
        if (seen.has(node.value.getPath())) {
            return undefined;
        }
        else {
            seen.add(node.value.getPath());
        }
        return getValueAtNode(graph, node.value.getNode(), seen);
    }
    else {
        return node.value;
    }
}
function shouldOverwrite(localValue, localState, remoteValue, remoteState) {
    return (remoteState >= localState &&
        (localState === remoteState
            ? JSON.stringify(remoteValue).length > JSON.stringify(localValue).length
            : true));
}
