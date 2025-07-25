const form = document.getElementById("loginForm");
const errorText = document.getElementById("error");

const hideAlert = () => {
  const alert = document.querySelector(".alert");
  if (alert) {
    alert.remove();
  }
};

const showAlert = (type, message) => {
  hideAlert();
  const markup = `<div class="alert alert--${type} animate__animated animate__fadeInDown ">${message}</div>`;

  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  window.setTimeout(() => {
    document.querySelector(".alert").remove();
  }, 3000);
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await axios.post("http://127.0.0.1:4000/api/auth/login", {
      email,
      password,
    });

    if (res.data.status === "success") {
      window.setTimeout(() => {
        location.assign("/"); // redirect after login
      }, 1500);
      showAlert("success", "Logged in successfully!");
      console.log(res);
    }
  } catch (err) {
    console.log(err);
    showAlert("error", err.response.data.message);
  }
});
