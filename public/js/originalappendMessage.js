// === Append a message to the message box ===
export function appendMessage(
  content,
  isSelf,
  messageTime,
  messageSeen,
  messageId
) {
  if (document.getElementById("messageBox")) {
    const messageBox = document.getElementById("messageBox");

    const wrapper = document.createElement("div");
    wrapper.className = isSelf ? "messageTimeWrapper" : "messageTimeWrapper-2";

    const bubble = document.createElement("div");
    bubble.className = isSelf ? "messageWrapper" : "messageWrapper-2";
    bubble.textContent = content;

    const time = document.createElement("p");
    time.className = "time";
    time.textContent = new Date(messageTime).toLocaleString("en-us", {
      month: "short",
      hour: "numeric",
      minute: "numeric",
      day: "numeric",
      year: "numeric",
      weekday: "short",
    });

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    messageBox.appendChild(wrapper);

    if (!messageSeen && isSelf) {
      const deliveredTicks = document.createElement("i");
      deliveredTicks.classList.add("fa-solid", "fa-check-double", "delivered");
      deliveredTicks.dataset.messageId = messageId;
      const messageTimeWrappers = document.querySelectorAll(
        ".messageTimeWrapper"
      );
      messageTimeWrappers.forEach((wrapper) =>
        wrapper.querySelector(".time").appendChild(deliveredTicks)
      );
    } else if (messageSeen && isSelf) {
      const seenTicks = document.createElement("i");
      seenTicks.classList.add("fa-solid", "fa-check-double", "seen");
      seenTicks.dataset.messageId = messageId;
      const messageTimeWrappers = document.querySelectorAll(
        ".messageTimeWrapper"
      );
      messageTimeWrappers.forEach((wrapper) =>
        wrapper.querySelector(".time").appendChild(seenTicks)
      );
    }

    messageBox.scrollTop = messageBox.scrollHeight;
  }
  return;
}
