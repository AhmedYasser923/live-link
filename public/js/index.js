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

document.addEventListener("DOMContentLoaded", () => {
  const loginFormContainer = document.getElementById("signin-form-container");
  const signupFormContainer = document.getElementById("signup-form-container");
  const forgotPasswordFormContainer = document.getElementById(
    "forgot-password-form-container"
  );

  const signupLinkLogin = document.getElementById("signup-link-login");
  const loginLinkSignup = document.getElementById("login-link-signup");
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const backToLoginLinkForgot = document.getElementById(
    "back-to-login-link-forgot"
  );

  const showForm = (formToShow) => {
    loginFormContainer.classList.add("hidden");
    signupFormContainer.classList.add("hidden");
    forgotPasswordFormContainer.classList.add("hidden");
    formToShow.classList.remove("hidden");
  };

  for (const elem of [
    signupLinkLogin,
    loginLinkSignup,
    forgotPasswordLink,
    backToLoginLinkForgot,
  ]) {
    elem.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        const container = document.getElementById(elem.dataset.container);
        showForm(container);
      },
      false
    );
  }
  showForm(loginFormContainer);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await axios.post("/api/auth/login", {
      email,
      password,
    });

    if (res.data.status === "success") {
      window.setTimeout(() => {
        location.assign("/chats"); // redirect after login
      }, 1500);
      showAlert("success", "Logged in successfully!");
      console.log(res);
    }
  } catch (err) {
    console.log(err);
    showAlert("error", err.response.data.message);
  }
});
