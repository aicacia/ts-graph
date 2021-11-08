import tape from "tape";
import { Graph, IEdgeJSON, IRefJSON, Ref } from "./Graph";

tape("Graph root level edges", (assert: tape.Test) => {
  const graph = new Graph<{
    ready: boolean;
  }>();
  graph.get("ready").set(true);
  assert.equal(graph.get("ready").getValue(), true);
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
        parentName: graph.get("nathan").get("name") as Ref<string>,
      }),
    },
  });

  assert.equal(graph.get("billy").get("name").getValue(), "Billy");
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

tape("Graph toJSON", (assert: tape.Test) => {
  const graph = new Graph<any>();
  graph.get("root").set({
    parent: graph.get("parent").set({
      child: graph.get("child").get("name").set("Child"),
    }),
  });
  const json = graph.toJSON();
  assert.equal((json["child/name"] as IEdgeJSON).value, "Child");
  assert.equal((json["parent/child"] as IRefJSON).id, "child/name");
  assert.equal((json["root/parent"] as IRefJSON).id, "parent");
  assert.end();
});
