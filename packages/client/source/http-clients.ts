import ky from "ky";
import axios from "axios";
import needle from "needle";

needle.get("http://www.google.com", function (error, response) {
  if (!error && response.statusCode == 200) console.log(response.body);
});

const res = await axios.get("", {});

const formData = new FormData();
// formData.

// const x = await ky("", {});
