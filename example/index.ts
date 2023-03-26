import SimplePeer from "simple-peer";
import { io } from "socket.io-client";
import { Mesh, Peer } from "@aicacia/mesh";
import App from "./App.svelte";
import { Graph, Ref } from "../src";
import type { IRefJSON, IEdgeJSON, INodeJSON, IDeleteJSON } from "../src";

declare global {
  interface Window {
    peer: Peer;
    mesh: Mesh;
    graph: Graph;
  }
}

type IMessage =
  | {
      path: string;
      json: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON;
    }
  | {
      path: string;
    };

type IUser = {
  name: string;
  things: { [key: string]: number };
};

type IState = {
  rooms: {
    [roomId: string]: {
      users: {
        [userId: string]: IUser;
      };
    };
  };
  user: Ref<IUser>;
};

async function onLoad() {
  const app = new App({
    target: document.body,
  });

  const peer = new Peer(
      io("wss://mesh.aicacia.com/graph-example", {
        transports: ["websocket"],
        withCredentials: true,
      }),
      SimplePeer
    ),
    mesh = new Mesh<IMessage>(peer),
    graph = new Graph<IState>();

  window.peer = peer;
  window.mesh = mesh;
  window.graph = graph;

  graph
    .on("set", (path, json) => {
      mesh.broadcast({
        path,
        json,
      });
    })
    .on("change", (_path, _json) => {
      // changed
    })
    .on("get", (path) => {
      mesh.broadcast({
        path,
      });
    });

  mesh.on("data", (data: IMessage) => {
    if ("json" in data) {
      graph.merge(data.path, data.json);
    } else {
      const node = graph.getNodeAtPath(data.path);

      if (node) {
        mesh.broadcast({
          path: node.getPath(),
          json: node.toJSON(),
        });
      }
    }
  });

  await peer.connected();

  const users = graph.get("rooms").get("r1").get("users");

  users.on(async (users) => {
    if (users) {
      const json = (
        await Promise.all(Object.values(users).map((ref) => ref.then()))
      ).filter((user) => user !== undefined);
      app.$set({ json: JSON.stringify(json, null, 2) });
    }
  });

  graph.get("user").on((user) => {
    app.$set({ name: user?.name || "" });
  });

  app.$on("change", (e) => {
    users.get(peer.getId()).get("name").set(e.detail);
  });

  users.get(peer.getId()).get("name").set("Anonymous");

  // set current user ref
  graph
    .get("user")
    .set(graph.get("rooms").get("r1").get("users").get(peer.getId()));

  peer.on("disconnection", (_connection, id) => {
    users.get(id).delete();
  });
}

window.addEventListener("load", onLoad);
