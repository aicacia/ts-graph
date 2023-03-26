<script>
  import { createEventDispatcher } from "svelte";

  export let name = "";
  export let json = "";

  export const dispatch = createEventDispatcher();

  function onChange(e) {
    dispatch("change", e.currentTarget.value);
  }
</script>

<div class="container">
  <div class="row">
    <div>
      <h1>Hello, {name}!</h1>
      <input type="text" value={name} placeholder="Name" on:input={onChange} />
      <pre><code id="json" />{json}</pre>
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
  .row {
    flex: 1;
    padding: 1rem;
  }
  h1 {
    margin: 0;
  }
</style>
