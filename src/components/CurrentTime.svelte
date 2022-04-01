<script>
  import { onMount } from "svelte";

  let time = new Date();

  $: hours = time.getHours();
  $: minutes = time.getMinutes();
  $: seconds = time.getSeconds();

  onMount(() => {
    const interval = setInterval(() => {
      time = new Date();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const days = [
    "Sunday",
    "Morning",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let month = months[time.getMonth()];
  let day = days[time.getDay()];
  let date = time.getDate();
  let year = time.getFullYear();
</script>

<main>
  <div class="container">
    <p class="date">{day}, {month} {date} of '{year}</p>
    <!--<p class="hour">{hours}:{minutes}:{seconds}</p>-->
  </div>
</main>

<style>
  main {
    margin-bottom: -15px;
  }
  .container {
    color: white;
    font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
    font-weight: 500;
    font-size: 16px;
  }
  .hour {
    margin-top: -15px;
  }
</style>
