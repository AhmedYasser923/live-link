//=====to get the user document and return it=====
export const getUserDoc = async (userId) => {
  try {
    const res = await axios.get(`http://127.0.0.1:4000/api/users/${userId}`);
    if (res.data.status === "success") {
      const userDoc = res.data.data.user;
      return userDoc;
    }
  } catch (error) {
    return console.error(error.response.data);
  }
};

export const processMessage = (message, maxLength = 30) => {
  if (message.length > maxLength) {
    return message.slice(0, maxLength) + "...";
  }
  return message;
};

export const processTimestamp = (timestamp, format) => {
  if (format === "short") {
    return new Date(timestamp).toLocaleString("en-us", {
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    });
  }
  return new Date(timestamp).toLocaleString("en-us", {
    month: "short",
    hour: "numeric",
    minute: "numeric",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  });
};
//-----------------------------------------------

function createLoader(id = "temp-loader") {
  const loader = document.createElement("div");
  loader.className = "loader";
  loader.id = id;
  return loader;
}

function showLoader(container, loaderId = "temp-loader") {
  const existing = document.getElementById(loaderId);
  if (!existing) {
    const loader = createLoader(loaderId);
    container.appendChild(loader);
  }
}

function hideLoader(loaderId = "temp-loader") {
  const loader = document.getElementById(loaderId);
  if (loader) loader.remove();
}

//---------------------------

//=====display the users on the sidebar=====
export const displayUsersOnSidebar = async (options) => {
  if (
    !document.querySelector(
      `.chat-wrapper[data-id="${options.otherParticipantID}"]`
    )
  ) {
    const userDoc = await getUserDoc(options.otherParticipantID);

    const chatWrapper = document.createElement("div");
    chatWrapper.className = "chat-wrapper";
    chatWrapper.dataset.id = userDoc._id;

    const userImg = document.createElement("img");
    userImg.src = `./img/${userDoc.photo}`;
    chatWrapper.appendChild(userImg);

    const layoutWrapper = document.createElement("div");
    layoutWrapper.className = "layout-wrapper";

    const userName = document.createElement("h5");
    userName.textContent = userDoc.name;
    layoutWrapper.appendChild(userName);

    const layoutWrapper2 = document.createElement("div");
    layoutWrapper2.className = "layout-wrapper2";

    const lastMessage = document.createElement("p");
    lastMessage.className = "last-message";
    layoutWrapper.appendChild(lastMessage);

    const lastMessageTimestamp = document.createElement("p");
    lastMessageTimestamp.className = "sidebar-time";

    layoutWrapper2.appendChild(lastMessageTimestamp);

    if (options.lastMessage) {
      const lastMessageSender = options.lastMessageSenderId;
      lastMessage.textContent =
        options.loggedInUserId === lastMessageSender
          ? `you: ${processMessage(options.lastMessage)}`
          : `${processMessage(options.lastMessage)}`;
      if (options.lastMessageWasSeen) {
        lastMessage.classList.add("message-read");
      } else if (
        !options.lastMessageWasSeen &&
        lastMessage.textContent.startsWith("you")
      ) {
        lastMessage.classList.add("message-read");
      } else if (
        options.lastMessageWasSeen &&
        lastMessage.textContent.startsWith("you")
      ) {
        lastMessage.classList.add("message-read");
      }
      lastMessageTimestamp.textContent = processTimestamp(
        options.lastMessageTimestamp,
        "short"
      );
    }

    chatWrapper.appendChild(layoutWrapper);
    chatWrapper.appendChild(layoutWrapper2);
    options.container.appendChild(chatWrapper);

    if (options.temporary) {
      document
        .querySelector(`.chat-wrapper[data-id="${options.otherParticipantID}"]`)
        .classList.add("temp-user");
    }

    return { chatWrapper };
  } else {
    return;
  }
};

//=====display conversation section=====

export const displayConversationSection = async (options) => {
  options.container.classList.add("animate__animated", "animate__fadeInDown");
  options.container.classList.toggle("hidden");
  options.container.innerHTML = "";

  const userDoc = await getUserDoc(options.otherParticipantID);

  const conversationHeader = document.createElement("div");
  conversationHeader.className = "conversation-header";
  conversationHeader.dataset.id = userDoc._id;

  const backIcon = document.createElement("i");
  backIcon.classList.add("fa-solid", "fa-arrow-left");

  const userImg = document.createElement("img");
  userImg.src = `/img/${userDoc.photo}`;

  const userName = document.createElement("h5");
  userName.textContent = userDoc.name;

  conversationHeader.appendChild(backIcon);
  conversationHeader.appendChild(userImg);
  conversationHeader.appendChild(userName);
  options.container.appendChild(conversationHeader);

  // Message box
  const messageBox = document.createElement("div");
  messageBox.id = "messageBox";
  options.container.appendChild(messageBox);

  // Input form
  const form = document.createElement("form");
  form.id = "chatForm";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type a message";

  const button = document.createElement("button");
  button.textContent = "Send";

  form.appendChild(input);
  form.appendChild(button);
  options.container.appendChild(form);

  return { messageBox, chatForm: form, backIcon };
};

//=====Loading conversation=====
export const loadConversation = async ({ otherParticipantID }) => {
  try {
    const res = await axios.get(
      `/api/conversations/${otherParticipantID}/messages`
    );

    if (res.data.status === "success") {
      if (res.data.data !== null) {
        const conversation = res.data.data.conversation;
        return { conversation };
      }
      return;
    }
  } catch (error) {
    console.log(error);
  }
};

//=====Loading Conversation Messages=====

export const loadConversationMessages = async ({
  conversationID,
  messageBox,
}) => {
  messageBox.innerHTML = "";
  showLoader(messageBox, "convo-loader");
  try {
    const res = await axios.get(`/api/messages/conversation/${conversationID}`);

    if (res.data.status === "success") {
      if (res.data.data !== null) {
        const messages = res.data.data.conversationMessages;

        return { messages };
      }
      return;
    }
  } catch (error) {
    console.log(error);
  } finally {
    hideLoader("convo-loader");
  }
};

//=====Appending Messages=====
export function appendMessages({ messageBox, messages, loggedInUserId }) {
  messages.forEach((message) => {
    const isSelf = loggedInUserId === message.sender._id;

    const messageWrapper = document.createElement("div");
    messageWrapper.className = "message-wrapper";
    messageWrapper.dataset.messageid = message._id;
    const messageBubble = document.createElement("div");
    messageBubble.className = "message-bubble";

    if (isSelf) {
      messageBubble.classList.add("right");
    } else {
      messageBubble.classList.add("left");
    }

    const content = document.createElement("p");
    content.textContent = message.content;
    content.className = "message-content";

    messageBubble.appendChild(content);

    const tickTimeWrapper = document.createElement("div");
    tickTimeWrapper.className = "tick-time-wrapper";

    const time = document.createElement("p");
    time.className = "time";
    time.textContent = processTimestamp(message.createdAt, "short");
    tickTimeWrapper.appendChild(time);

    messageWrapper.appendChild(messageBubble);
    messageBubble.appendChild(tickTimeWrapper);
    messageBox.appendChild(messageWrapper);

    if (!message.seen && isSelf) {
      const deliveredTicks = document.createElement("i");
      deliveredTicks.classList.add("fa-solid", "fa-check-double", "delivered");
      const messageBubbles = document.querySelectorAll(".right");
      messageBubbles.forEach((messageBubble) => {
        // messageBubble.appendChild(deliveredTicks)
        const tickTimeWrapper =
          messageBubble.querySelector(".tick-time-wrapper");
        tickTimeWrapper.appendChild(deliveredTicks);
      });
    } else if (message.seen && isSelf) {
      const seenTicks = document.createElement("i");
      seenTicks.classList.add("fa-solid", "fa-check-double", "seen");
      const messageBubbles = document.querySelectorAll(".right");
      messageBubbles.forEach((messageBubble) => {
        // messageBubble.appendChild(seenTicks)
        const tickTimeWrapper =
          messageBubble.querySelector(".tick-time-wrapper");
        tickTimeWrapper.appendChild(seenTicks);
      });
    }
  });

  messageBox.scrollTop = messageBox.scrollHeight;
}

//=====append one message====
export function appendMessage({ messageBox, message, loggedInUserId }) {
  const isSelf = loggedInUserId === message.sender;

  const messageWrapper = document.createElement("div");
  messageWrapper.className = "message-wrapper";
  messageWrapper.dataset.messageid = message._id;
  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";

  if (isSelf) {
    messageBubble.classList.add("right");
  } else {
    messageBubble.classList.add("left");
  }
  messageBubble.textContent = message.content;

  const tickTimeWrapper = document.createElement("div");
  tickTimeWrapper.className = "tick-time-wrapper";

  const time = document.createElement("p");
  time.className = "time";
  time.textContent = processTimestamp(message.createdAt, "short");
  tickTimeWrapper.appendChild(time);

  messageWrapper.appendChild(messageBubble);
  messageBubble.appendChild(tickTimeWrapper);
  messageBox.appendChild(messageWrapper);

  if (!message.seen && isSelf) {
    const deliveredTicks = document.createElement("i");

    deliveredTicks.classList.add(
      "fa-solid",
      "fa-check-double",
      "delivered",
      "tick-icon"
    );
    const messageBubbles = document.querySelectorAll(".right");
    messageBubbles.forEach((messageBubble) => {
      const tickTimeWrapper = messageBubble.querySelector(".tick-time-wrapper");
      tickTimeWrapper.appendChild(deliveredTicks);
    });
  } else if (message.seen && isSelf) {
    const seenTicks = document.createElement("i");
    seenTicks.classList.add("fa-solid", "fa-check-double", "seen", "tick-icon");
    const messageBubbles = document.querySelectorAll(".right");
    messageBubbles.forEach((messageBubble) => {
      const tickTimeWrapper = messageBubble.querySelector(".tick-time-wrapper");
      tickTimeWrapper.appendChild(seenTicks);
    });
  }

  messageBox.scrollTop = messageBox.scrollHeight;
}

//=====Sending a Message=====

export const sendMessage = async ({ otherParticipantID, content }) => {
  try {
    const res = await axios.post(
      `/api/conversations/${otherParticipantID}/messages`,
      {
        content,
      }
    );

    if (res.data.status === "success") {
      const message = res.data.data.message;
      return { message };
    }
  } catch (error) {
    console.log(error.response);
  }
};

//====Update Last Message====
export const updateLastMessage = ({
  container,
  message,
  when,
  otherParticipantID,
}) => {
  const chat = container.querySelector(
    `.chat-wrapper[data-id="${otherParticipantID}"]`
  );

  const lastMessage = chat.querySelector(".last-message");

  if (when === "onReceive") {
    lastMessage.textContent = "";
    lastMessage.textContent = `${processMessage(message.content)}`;
    if (!message.seen) {
      lastMessage.classList.add("message-not-read");
    } else {
      lastMessage.classList.remove("message-not-read");

      lastMessage.classList.add("message-read");
    }
  } else if (when === "onSend") {
    lastMessage.textContent = "";
    lastMessage.textContent = `you: ${processMessage(message.content)}`;
    lastMessage.classList.remove("message-not-read");
    lastMessage.classList.add("message-read");
  }

  const lastMessageTimestamp = chat.querySelector(".sidebar-time");
  lastMessageTimestamp.textContent = "";
  lastMessageTimestamp.textContent = processTimestamp(
    message.createdAt,
    "short"
  );
};
