const GIPHY_API_KEY = "tkP9CM7FyLvCewOCFwPFevR83vvk0fe1";

function fetchGif(weather) {
  let query = "";
  switch (weather.toLowerCase()) {
    case "clear":
      query = "sunny weather";
      break;
    case "clouds":
      query = "cloudy weather";
      break;
    case "rain":
      query = "rainy weather";
      break;
    case "thunderstorm":
      query = "thunderstorm weather";
      break;
    case "snow":
      query = "snow weather";
      break;
    case "mist":
    case "fog":
      query = "foggy weather";
      break;
    default:
      query = weather + " weather";
  }

  fetch(`https://api.giphy.com/v1/gifs/translate?api_key=${GIPHY_API_KEY}&s=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(gifData => {
      const gifImg = document.getElementById('gifResult');
      if (gifImg && gifData.data && gifData.data.images && gifData.data.images.fixed_height) {
        gifImg.src = gifData.data.images.fixed_height.url;
        document.body.style.backgroundImage = `url('${gifData.data.images.original.url}')`;
      } else if (gifImg) {
        gifImg.src = "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif";
      } else {
        document.body.style.backgroundImage = `url('${gifData.data.images.original.url}')`;
      }
    })
    .catch(() => {
      const gifImg = document.getElementById('gifResult');
      if (gifImg) gifImg.src = "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif";
    });
}