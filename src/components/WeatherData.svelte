<script>
  import Icon from "svelte-icons-pack/Icon.svelte";
  import WiHumidity from "svelte-icons-pack/wi/WiHumidity";
  import WiBarometer from "svelte-icons-pack/wi/WiBarometer";
  import WiStrongWind from "svelte-icons-pack/wi/WiStrongWind";
  import WiThermometer from "svelte-icons-pack/wi/WiThermometer";

  export let humidity;
  export let feelsLike;
  export let pressure;
  export let wind;
</script>

<main>
  <div class="container">
    <Icon src={WiHumidity} color="white" size="35" class="customIcon" />
    <div class="info">
      <p>Humidity</p>
      <p class="data">{humidity}%</p>
    </div>
  </div>
  <div class="container">
    <Icon src={WiBarometer} color="white" size="35" class="customIcon" />
    <div class="info">
      <p>Air Pressure</p>
      <p class="data">{pressure}PS</p>
    </div>
  </div>
  <div class="container">
    <Icon src={WiStrongWind} color="white" size="35" class="customIcon" />
    <div class="info">
      <p>Wind Speed</p>
      <p class="data">{wind} km/h</p>
    </div>
  </div>
  <div class="container">
    <Icon src={WiThermometer} color="white" size="35" class="customIcon" />
    <div class="info">
      <p>Feels Like</p>
      <p class="data">{feelsLike}°C</p>
    </div>
  </div>
</main>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .data {
    margin-top: -15px;
    font-size: 18px;
    font-weight: 800;
  }
  main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .info {
    width: 40px;
    margin-left: 15px;
  }
</style>
