<script>
  import Icon from "svelte-icons-pack/Icon.svelte";

  import WiDaySunny from "svelte-icons-pack/wi/WiDaySunny";
  import WiDayCloudy from "svelte-icons-pack/wi/WiDayCloudy";
  import WiDayRain from "svelte-icons-pack/wi/WiDayRain";
  import WiDayThunderstorm from "svelte-icons-pack/wi/WiDayThunderstorm";
  import WiDaySnow from "svelte-icons-pack/wi/WiDaySnow";

  import WiCloudy from "svelte-icons-pack/wi/WiCloudy";
  import WiRain from "svelte-icons-pack/wi/WiRain";
  import WiSnow from "svelte-icons-pack/wi/WiSnow";
  import WiCloudyWindy from "svelte-icons-pack/wi/WiCloudyWindy";

  import WiNightClear from "svelte-icons-pack/wi/WiNightClear";
  import WiNightAltCloudy from "svelte-icons-pack/wi/WiNightAltCloudy";
  import WiNightAltRain from "svelte-icons-pack/wi/WiNightAltRain";
  import WiNightAltStormShowers from "svelte-icons-pack/wi/WiNightAltStormShowers";
  import WiNightAltSnow from "svelte-icons-pack/wi/WiNightAltSnow";

  import CurrentTime from "./CurrentTime.svelte";
  import Theme from "./Theme.svelte";
  import Search from "./Search.svelte";
  import WeatherData from "./WeatherData.svelte";

  let city = "";
  let promise = [];

  let icons = {
    Sunny: [WiDaySunny, WiDayCloudy, WiDayRain, WiDayThunderstorm, WiDaySnow],
    Cloudy: [WiCloudy, WiRain, WiSnow, WiCloudyWindy],
    Night: [
      WiNightClear,
      WiNightAltCloudy,
      WiNightAltRain,
      WiNightAltStormShowers,
      WiNightAltSnow,
    ],
  };

  function getIcon(weather) {
    if (weather == "Clear") {
      return icons.Sunny[0];
    } else if (weather == "Clouds") {
      return icons.Cloudy[0];
    } else if (weather == "Atmosphere") {
      return icons.Cloudy[3];
    } else if (weather == "Snow") {
      return icons.Sunny[4];
    } else if (weather == "Rain") {
      return icons.Cloudy[1];
    } else if (weather == "Drizzle" || weather == "Fog") {
      return icons.Sunny[2];
    } else if (weather == "Thunderstorm") {
      return icons.Night[3];
    }
  }
  const KEY = "d4917a86ad00c8f97c306ecfa4544840";

  function main() {
    if (city.length != 0) {
      async function getLocation() {
        const response = await fetch(
          `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${KEY}`
        );
        const data = await response.json();
        const location = data;

        //console.log(location[0]);
        return location[0];
      }
      async function getWeather() {
        let location = await getLocation();
        let lon = await location.lon;
        let lat = await location.lat;

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}`
        );

        const data = await response.json();
        const fullData = data;

        const FULL_DATA = {
          city: fullData.name,
          country: location.country,
          weather: fullData.weather[0].main,
          description: fullData.weather[0].description,
          wind: fullData.wind.speed,
          temp: parseInt(fullData.main.temp - 273),
          feels: parseInt(fullData.main.feels_like - 273),
          icon: getIcon(fullData.weather[0].main),
          humidity: fullData.main.humidity,
          pressure: fullData.main.pressure,
        };
        city = "";
        return FULL_DATA;
      }
      return (promise = getWeather());
    }
  }
</script>

<main>
  <header class="header-container">
    <Theme />
    <Search bind:city on:click={main} />
  </header>
  <div class="content">
    {#await promise}
      Waiting...
    {:then FULL_DATA}
      {#if FULL_DATA.city}
        <div class="left">
          <p class="location">{FULL_DATA.city}, {FULL_DATA.country}</p>
          <CurrentTime />
          <Icon
            src={FULL_DATA.icon}
            color="white"
            size="150"
            class="weather-icon"
          />
          <p class="weather">{FULL_DATA.weather}</p>
          <p class="weather-description">{FULL_DATA.description}</p>
          <p class="temperature">{FULL_DATA.temp}°C</p>
        </div>
        <div class="right">
          <WeatherData
            humidity={FULL_DATA.humidity}
            pressure={FULL_DATA.pressure}
            wind={FULL_DATA.wind}
            feelsLike={FULL_DATA.feels}
          />
        </div>
      {/if}
    {/await}
  </div>
</main>

<style>
  .header-container {
    display: flex;
    justify-content: space-between;
    margin: 20px 40px;
  }
  .content {
    color: white;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 20px 120px;
    text-transform: capitalize;
  }
  .location {
    font-size: 24px;
    margin-bottom: -15px;
  }
  .weather {
    margin-top: -18px;
    margin-bottom: -18px;
  }
  .temperature {
    font-size: 36px;
    font-weight: 800;
    margin-top: -15px;
  }
  .right {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
