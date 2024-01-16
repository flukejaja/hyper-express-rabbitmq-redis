for (let i = 0; i < 5000; i++) {
  fetch("http://localhost:1112/", {
    method: "POST",
    body: JSON.stringify({
      name: "test" + i,
      pass: "test",
    }),
  }).then((response) => {
    console.log(response);
  });
}
