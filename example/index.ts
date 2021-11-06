import SimplePeer from "simple-peer";
import { Mesh, Peer } from "@aicacia/mesh";
import { Graph, Ref } from "../src";
import type { IRefJSON, IEdgeJSON, INodeJSON } from "../src/Graph";

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
      json: IRefJSON | IEdgeJSON | INodeJSON;
    }
  | {
      path: string;
    };

type IUser = {
  name: string;
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
  const peer = new Peer(SimplePeer, {
      namespace: "example-graph",
    }),
    mesh = new Mesh(peer),
    graph = new Graph<IState>();

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
          path: data.path,
          json: node.toJSON(),
        });
      }
    }
  });

  await peer.connected();

  graph
    .get("user")
    .set(graph.get("rooms").get("r1").get("users").get(peer.getId()));

  const users = graph.get("rooms").get("r1").get("users");

  users.on((_users) => {
    document.getElementById("json").innerHTML = JSON.stringify(graph, null, 2);
  });

  graph.get("user").on((user) => {
    document.getElementById("name").innerHTML = user?.name;
  });

  document.getElementById("name-input").addEventListener("input", (e) => {
    users
      .get(peer.getId())
      .get("name")
      .set((e.currentTarget as HTMLInputElement).value);
  });
}

window.addEventListener("load", onLoad);
