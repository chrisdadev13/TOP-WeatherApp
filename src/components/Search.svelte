<script>
  import Icon from "svelte-icons-pack/Icon.svelte";
  import FaSolidSearch from "svelte-icons-pack/fa/FaSolidSearch";

  export let city = "";
</script>

<main>
  <div class="city-input">
    <input type="text" placeholder="Location... 📍" bind:value={city} />
    <button on:click>
      <div class="search">
        <Icon class="searchIcon" color="white" size="20" src={FaSolidSearch} />
      </div>
    </button>
  </div>
</main>

<style>
  .city-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: rgb(66, 66, 66, 0.7);
    opacity: 0.8;
    width: 300px;
    height: 45px;
    border-radius: 20px;
  }
  input {
    background-color: transparent;
    border: none;
    color: white;
    margin-top: 5px;
  }
  input:focus {
    outline: none;
  }
  button {
    background-color: transparent;
    border: none;
    color: white;
    cursor: pointer;
    margin-top: 10px;
  }
</style>
