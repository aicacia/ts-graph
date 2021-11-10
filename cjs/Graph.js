"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentPathAndKey = exports.Graph = exports.Ref = exports.Edge = exports.Node = exports.Entry = exports.SEPERATOR = void 0;
const tslib_1 = require("tslib");
const eventemitter3_1 = require("eventemitter3");
const immediate_1 = (0, tslib_1.__importDefault)(require("immediate"));
exports.SEPERATOR = "/";
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
            ? this.parent.getPath() + exports.SEPERATOR + this.key
            : this.key;
    }
    toJSON() {
        return {
            state: this.state,
        };
    }
}
exports.Entry = Entry;
class Node extends Entry {
    constructor() {
        super(...arguments);
        this.children = new Map();
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
        return Object.assign(Object.assign({}, super.toJSON()), { children });
    }
}
exports.Node = Node;
class Edge extends Entry {
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
            : Object.assign(Object.assign({}, super.toJSON()), { value: this.value });
    }
}
exports.Edge = Edge;
class Ref {
    constructor(graph, path, state) {
        this.graph = graph;
        this.path = path;
        this.state = state;
        this.waitMS = graph.getWaitMS();
    }
    get(key) {
        return new Ref(this.graph, this.path + exports.SEPERATOR + key, this.state);
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
                    (0, immediate_1.default)(off);
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
class Graph extends eventemitter3_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.state = Date.now();
        this.entries = new Map();
        this.listeningPaths = new Set();
        this.waitMS = 5000;
    }
    setWaitMS(waitMS) {
        this.waitMS = waitMS;
        return this;
    }
    getWaitMS() {
        return this.waitMS;
    }
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
    listenAtPath(path, emit = true) {
        if (emit) {
            this.emit("get", path);
        }
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
                    this.mergePathInternal(node.getPath() + exports.SEPERATOR + key, child);
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
                this.setPathInternal(path + exports.SEPERATOR + k, v, state);
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
        const keys = path.split(exports.SEPERATOR), key = keys.shift();
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
        let node = parent === null || parent === void 0 ? void 0 : parent.children.get(key);
        if (node instanceof Edge) {
            node.state = state;
            return node;
        }
        else {
            node = new Edge(this, parent, key, state, null);
            if (parent) {
                parent === null || parent === void 0 ? void 0 : parent.children.set(key, node);
            }
            else {
                this.entries.set(key, node);
            }
            return node;
        }
    }
}
exports.Graph = Graph;
function getParentPathAndKey(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return [undefined, path];
    }
    else {
        return [path.substring(0, index), path.substring(index + 1)];
    }
}
exports.getParentPathAndKey = getParentPathAndKey;
function getNodeAtPath(graph, path, nodes) {
    const seen = nodes.get(path);
    if (seen !== undefined) {
        return seen || undefined;
    }
    else {
        const keys = path.split(exports.SEPERATOR), key = keys.shift(), node = graph.getEntries().get(key);
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
            const child = node.children.get(key), childPath = path + exports.SEPERATOR + key;
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
