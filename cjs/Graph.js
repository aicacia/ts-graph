"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentPathAndKey = exports.Graph = void 0;
const eventemitter3_1 = require("eventemitter3");
const Edge_1 = require("./Edge");
const Node_1 = require("./Node");
const Ref_1 = require("./Ref");
const types_1 = require("./types");
class Graph extends eventemitter3_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.state = Date.now();
        this.entries = {};
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
    getState() {
        return this.state;
    }
    get(key) {
        return new Ref_1.Ref(this, key, this.state);
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
        return getNodeAtPath(this, path, {});
    }
    set(path, value) {
        this.state = Date.now();
        this.setPathInternal(path, value, this.state);
        return this;
    }
    delete(path) {
        this.state = Date.now();
        this.deletePathInternal(path, this.state);
        return this;
    }
    merge(path, json) {
        if (this.isListening(path)) {
            const maxState = Date.now();
            if ("children" in json) {
                for (const [key, child] of Object.entries(json.children)) {
                    this.mergePathInternal(path + types_1.SEPERATOR + key, child, maxState);
                }
            }
            else if ("delete" in json) {
                this.mergeDeletePathInternal(path, json.state, maxState);
            }
            else {
                this.mergePathInternal(path, json, maxState);
            }
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
    toJSON() {
        return {
            state: this.state,
            entries: Object.entries(this.entries).reduce((entries, [key, value]) => {
                entries[key] = value.toJSON();
                return entries;
            }, {}),
        };
    }
    mergePathInternal(path, json, maxState) {
        const jsonState = json.state;
        if (jsonState > maxState) {
            setTimeout(() => this.mergePathEdgeInternal(path, json), jsonState - maxState);
        }
        else {
            this.mergePathEdgeInternal(path, json);
        }
        return this;
    }
    mergePathEdgeInternal(path, json) {
        const jsonState = json.state, node = this.getNodeAtPath(path);
        const jsonValue = "value" in json ? json.value : new Ref_1.Ref(this, json.id, jsonState);
        if (node instanceof Edge_1.Edge) {
            if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
                node.value = jsonValue;
                node.state = jsonState;
                this.emit("change", node.getPath(), node.toJSON());
            }
        }
        else if (node instanceof Node_1.Node) {
            if (shouldOverwrite(new Ref_1.Ref(this, node.getPath(), jsonState), node.state, jsonValue, jsonState)) {
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
        return this;
    }
    mergeDeletePathInternal(path, jsonState, maxState) {
        if (jsonState > maxState) {
            setTimeout(() => this.mergeDeletePathEdgeInternal(path, jsonState), jsonState - maxState);
        }
        else {
            this.mergeDeletePathEdgeInternal(path, jsonState);
        }
        return this;
    }
    mergeDeletePathEdgeInternal(path, jsonState) {
        const [parentPath, key] = getParentPathAndKey(path), node = this.getNodeAtPath(path), parent = parentPath ? this.getNodeAtPath(parentPath) : null;
        if (node) {
            if (shouldDelete(node.state, jsonState)) {
                if (parent instanceof Node_1.Node) {
                    delete parent.children[key];
                    this.emit("change", parentPath, parent.toJSON());
                }
            }
        }
        return this;
    }
    setPathInternal(path, value, state) {
        if (value instanceof Ref_1.Ref) {
            this.setEdgePathInternal(path, value, state);
        }
        else if (value !== null && typeof value === "object") {
            for (const [k, v] of Object.entries(value)) {
                this.setPathInternal(path + types_1.SEPERATOR + k, v, state);
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
        const keys = path.split(types_1.SEPERATOR), key = keys.shift();
        let parent = this.entries[key];
        if (!(parent instanceof Node_1.Node)) {
            parent = new Node_1.Node(this, null, key, state);
            this.entries[key] = parent;
        }
        return keys.reduce((parent, key) => {
            const node = parent.children[key];
            if (node instanceof Node_1.Node) {
                return node;
            }
            else if (node instanceof Edge_1.Edge) {
                if (node.value instanceof Ref_1.Ref) {
                    const refNode = node.value.getNode();
                    if (refNode instanceof Node_1.Node) {
                        return refNode;
                    }
                }
            }
            const newNode = new Node_1.Node(this, parent, key, state);
            parent.children[key] = newNode;
            return newNode;
        }, parent);
    }
    createEdgeAt(path, state) {
        const [parentPath, key] = getParentPathAndKey(path), parent = parentPath ? this.createNodeAt(parentPath, state) : null;
        let node = parent === null || parent === void 0 ? void 0 : parent.children[key];
        if (node instanceof Edge_1.Edge) {
            node.state = state;
            return node;
        }
        else {
            node = new Edge_1.Edge(this, parent, key, state, null);
            if (parent) {
                parent.children[key] = node;
            }
            else {
                this.entries[key] = node;
            }
            return node;
        }
    }
    deletePathInternal(path, state) {
        const [parentPath, key] = getParentPathAndKey(path), parent = parentPath ? this.createNodeAt(parentPath, state) : null;
        if (parent) {
            delete parent.children[key];
            this.emit("change", path, { state, delete: true });
            this.emit("set", path, { state, delete: true });
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
    const seen = nodes[path];
    if (seen !== undefined) {
        return seen || undefined;
    }
    else {
        const keys = path.split(types_1.SEPERATOR), key = keys.shift(), node = graph.getEntries()[key];
        if (node && keys.length) {
            nodes[key] = node;
            return getNodeAtPathInternal(graph, key, node, keys, nodes);
        }
        else {
            return node;
        }
    }
}
function getNodeAtPathInternal(graph, path, node, keys, nodes) {
    if (node instanceof Node_1.Node) {
        const key = keys.shift();
        if (key) {
            const child = node.children[key], childPath = path + types_1.SEPERATOR + key;
            if (child) {
                nodes[childPath] = child;
                return getNodeAtPathInternal(graph, childPath, child, keys, nodes);
            }
            else {
                nodes[childPath] = null;
                return undefined;
            }
        }
        else {
            nodes[path] = node;
            return node;
        }
    }
    else if (node.value instanceof Ref_1.Ref) {
        const refPath = node.value.getPath(), refNode = getNodeAtPath(graph, refPath, nodes);
        if (refNode && refNode !== node) {
            return getNodeAtPathInternal(graph, path, refNode, keys, nodes);
        }
        else {
            nodes[refPath] = null;
            return undefined;
        }
    }
    else {
        nodes[path] = node;
        return node;
    }
}
function getValueAtNode(graph, node, seen = new Set()) {
    if (!node) {
        return undefined;
    }
    else if (node instanceof Node_1.Node) {
        const children = {};
        for (const [k, c] of Object.entries(node.children)) {
            const childValue = c instanceof Edge_1.Edge
                ? c.value
                : (children[k] = new Ref_1.Ref(graph, c.getPath(), c.state));
            children[k] = childValue;
        }
        return children;
    }
    else if (node.value instanceof Ref_1.Ref) {
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
function shouldDelete(localState, remoteState) {
    return remoteState >= localState;
}
