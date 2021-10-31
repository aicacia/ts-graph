import { Graph } from "../src";

declare global {
  interface Window {
    server: Graph;
    client: Graph;
  }
}

function onLoad() {
  const server = new Graph();
  const client = new Graph();

  window.server = server;
  window.client = client;

  function render() {
    document.getElementById("client-code").innerText = JSON.stringify(
      client,
      null,
      2
    );
    document.getElementById("server-code").innerText = JSON.stringify(
      server,
      null,
      2
    );
  }

  server
    .on("set", (json) => {
      client.merge(json, false);
      render();
    })
    .on("get", (path) => {
      const value = client.getPathValue(path, false);
      console.log("server get", path, value);
    });
  client
    .on("set", (json) => {
      server.merge(json, false);
      render();
    })
    .on("get", (path) => {
      const value = server.getPathValue(path, false);
      console.log("client get", path, value);
    });

  server.get("nathan").set({
    name: "Nathan",
    children: {
      billy: server.get("billy").set({
        name: "Billy",
        parent: server.get("nathan"),
        parentName: server.get("nathan").get("name"),
      }),
    },
  });

  server.get("nathan").on((state) => {
    console.log(state);
  });
}

window.addEventListener("load", onLoad);
