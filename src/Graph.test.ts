import tape from "tape";
import { Graph, Ref } from "./Graph";

tape("Graph root level edges", (assert: tape.Test) => {
  const graph = new Graph<{
    ready: boolean;
  }>();
  graph.get("ready").set(true);
  assert.equal(graph.get("ready").getValue(), true);
  assert.end();
});

tape("Graph promise immediate", async (assert: tape.Test) => {
  const graph = new Graph<{
    ready: boolean;
  }>();
  graph.get("ready").set(true);
  assert.equal(await graph.get("ready"), true);
  assert.end();
});

tape("Graph promise missing", async (assert: tape.Test) => {
  const graph = new Graph<{
    ready: boolean;
  }>();
  const promise = graph.get("ready");
  graph.get("ready").set(true);
  assert.equal(await promise, true);
  assert.end();
});

tape("Graph promise error", async (assert: tape.Test) => {
  const graph = new Graph<{
    ready: boolean;
  }>();
  let error: Error | undefined;
  try {
    await graph.get("ready").setWaitMS(1);
  } catch (e) {
    error = e as Error;
  }
  assert.equal(error?.message, `Request took longer than 1ms to resolve`);
  assert.end();
});

tape("Graph circular ref test", (assert: tape.Test) => {
  type IBilly = {
    name: string;
    parent: Ref<INathan>;
    parentName: Ref<string>;
  };

  type INathan = {
    name: string;
    children: {
      billy: Ref<IBilly>;
    };
  };

  const graph = new Graph<{
    nathan: INathan;
    billy: IBilly;
  }>();

  graph.get("nathan").set({
    name: "Nathan",
    children: {
      billy: graph.get("billy").set({
        name: "Billy",
        parent: graph.get("nathan"),
        parentName: graph.get("nathan").get("name"),
      }),
    },
  });

  assert.equal(graph.get("billy").get("name").getValue(), "Billy");
  assert.equal(graph.get("nathan").get("name").getValue(), "Nathan");
  assert.equal(
    graph
      .get("nathan")
      .get("children")
      .get("billy")
      .get("parent")
      .get("name")
      .getValue(),
    "Nathan"
  );
  assert.equal(
    graph
      .get("nathan")
      .get("children")
      .get("billy")
      .get("parentName")
      .getValue(),
    "Nathan"
  );

  assert.end();
});

tape("Graph get missing", (assert: tape.Test) => {
  let called = false;
  const graph = new Graph<{ root: { parent: { child: string } } }>();
  graph.on("get", () => {
    called = true;
  });
  graph.get("root").get("parent").get("child").getValue();
  assert.equal(called, true, "get event should fire");
  assert.end();
});

tape("Graph syncing graphs", (assert: tape.Test) => {
  type State = {
    parent: {
      child: {
        name: string;
      };
    };
  };
  const a = new Graph<State>();
  const b = new Graph<State>();

  a.on("set", (path, json) => {
    b.merge(path, json);
  }).on("get", (path) => {
    const node = b.getNodeAtPath(path);

    if (node) {
      a.merge(node.getPath(), node.toJSON());
    }
  });
  b.on("set", (path, json) => {
    a.merge(path, json);
  }).on("get", (path) => {
    const node = a.getNodeAtPath(path);

    if (node) {
      b.merge(node.getPath(), node.toJSON());
    }
  });

  b.get("parent")
    .get("child")
    .on((child) => {
      assert.equal(child?.name, "Nathan");
    });

  a.get("parent").get("child").get("name").set("Nathan");

  assert.equal(b.get("parent").get("child").get("name").getValue(), "Nathan");
  assert.equal(a.get("parent").get("child").get("name").getValue(), "Nathan");

  assert.end();
});
