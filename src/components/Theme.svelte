<script>
  let url = [
    "bg-one.jpg",
    "bg-two.jpg",
    "bg-three.jpg",
    "bg-four.jpg",
    "bg-five.jpg",
    "bg-six.jpeg",
    "bg-sevent.webp",
  ];

  let data = [
    { name: "Aesthetic sky", url: url[0] },
    { name: "Aesthetic Lake (night)", url: url[1] },
    { name: "Japanese hood (night)", url: url[2] },
    { name: "Sun and sky", url: url[3] },
    { name: "Plants and lake", url: url[4] },
    { name: "Night on another planet (night)", url: url[5] },
    { name: "Aesthetic sky landscape (night)", url: url[6] },
  ];

  let currentTheme = "";
  let defaultTheme = "default.jpg";
  window.document.body.style.cssText = `background-image: url(${defaultTheme})`;

  function changeTheme() {
    currentTheme = event.target.id;
    window.document.body.style.cssText = `background-image: url(${currentTheme})`;
  }
</script>

<main>
  <select name="themes">
    <option id={defaultTheme} on:click={changeTheme}>Theme ⭐</option>
    {#each data as theme}
      <option id={theme.url} on:click={changeTheme}>{theme.name}</option>
    {/each}
  </select>
</main>

<style>
  select {
    background-color: rgb(66, 66, 66, 0.7);
    border: none;
    color: #828387;
    width: 250px;
    border-radius: 20px;
  }
</style>
