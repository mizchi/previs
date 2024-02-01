<script lang="ts">
  let counter: number = 0;
</script>

<div>hello</div>
<button on:click={() => (counter += 1)}>
  Clicked {counter}
  {counter === 1 ? "time" : "times"}
</button>
