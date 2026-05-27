const start = Date.now();
console.log("Sending request to http://localhost:3000/...");
fetch("http://localhost:3000/")
  .then((res) => {
    console.log(`Response received in ${Date.now() - start}ms`);
    console.log("Status:", res.status);
    return res.text();
  })
  .then((text) => {
    console.log("Length of body:", text.length);
  })
  .catch((err) => {
    console.error("Request failed:", err);
  });
