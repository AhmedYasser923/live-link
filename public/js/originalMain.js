import { appendMessage } from "./appendMessage1.js";
import { processMessage } from "./utilities.js";

const notificationSound = new Audio("../sounds/notification.mp3");
notificationSound.volume = 0.5; // optional: set volume

// Create audio instance once

// === DOM Elements ===
const UsersMenu = document.querySelector(".users-menu__items");
const usersMenuContainer = document.querySelector(".users-menu");
const nav = document.querySelector(".nav");
const currentUser = nav.dataset.currentuser;
const conversationWrapper = document.querySelector(".conversation-wrapper");

const socket = io();
socket.emit("add-user", currentUser);

let onlineUserIds = [];

socket.on("online-users", (userIds) => {
  onlineUserIds = userIds;
  updateOnlineStatus();
});

function updateOnlineStatus() {
  if (!onlineUserIds.length) return;

  document.querySelectorAll(".users-menu__item.online").forEach((el) => {
    el.classList.remove("online");
  });

  onlineUserIds.forEach((userId) => {
    const userItem = document.querySelector(
      `.users-menu__item[data-userid="${userId}"]`
    );
    if (userItem) {
      userItem.classList.add("online");
    }
  });
}

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

// === Fetch all users ===
const getConversations = async () => {
  showLoader(usersMenuContainer, "convo-loader");
  try {
    const res = await axios({
      method: "GET",
      url: "http://127.0.0.1:4000/api/conversations",
    });

    if (res.data.status === "success") {
      if (res.data.data !== null) {
        const conversations = res.data.data.conversations;

        conversations.forEach(async (conversation) => {
          const otherParticipant = conversation.participants.filter(
            (participant) => participant !== currentUser
          );

          if (otherParticipant) {
            // getUser(otherParticipant[0]._id);
            await getUserDoc(otherParticipant[0], "displayOnSidebar");
            const userListItem = document.querySelector(
              `.users-menu__item[data-userid="${otherParticipant[0]}"]`
            );
            userListItem.dataset.convoid = conversation._id;
            const nameMessageWrapper = userListItem.querySelector(
              ".name-message-wrapper"
            );
            const lastMessage = document.createElement("p");
            lastMessage.className = "last-message";
            lastMessage.textContent =
              conversation.lastMessageSender.toString() === currentUser
                ? processMessage(` you: ${conversation.lastMessage}`)
                : processMessage(conversation.lastMessage);
            nameMessageWrapper.appendChild(lastMessage);
            const LastMessageTime = document.createElement("p");
            LastMessageTime.className = "last-message-time";
            LastMessageTime.textContent = new Date(
              conversation.updatedAt
            ).toLocaleString("en-us", {
              hour: "numeric",
              minute: "numeric",
              weekday: "short",
            });
            nameMessageWrapper.appendChild(LastMessageTime);
          }
        });
      }
      return;
    }
  } catch (error) {
    if (
      error.response &&
      error.response.status === 404 &&
      error.response.data.message.includes(
        "you don't have any conversations yet"
      )
    ) {
      return;
    } else {
      console.error(
        "Failed to fetch users",
        error.response?.data || error.message
      );
    }
  } finally {
    hideLoader("convo-loader");
  }
};
// === Initialise user list ===
getConversations();

//===get user document===
const getUserDoc = async (userId, location) => {
  try {
    const res = await axios.get(`http://127.0.0.1:4000/api/users/${userId}`);

    if (res.data.status === "success") {
      const user = res.data.data.user;
      if (location === "displayOnSidebar") {
        appendUser(user);
        updateOnlineStatus();

        return user;
      } else {
        displayConversationSection(user);
        return user;
      }
    }
  } catch (error) {
    console.error("Failed to get user", error?.response?.data || error.message);
  }
};

// === Handle user clicks ===
if (UsersMenu) {
  UsersMenu.addEventListener("click", async (event) => {
    event.preventDefault();
    const clickedUserItem = event.target.closest(".users-menu__item");

    if (clickedUserItem) {
      const userId = clickedUserItem.dataset.userid;
      await getUserDoc(userId, "displayUserOnConversationHeader");
    }
  });
} else {
  console.error("Error: .users-menu__items container not found");
}

// === Append a user to the user list ===
const appendUser = (user, convoId) => {
  const exists = document.querySelector(
    `.users-menu__item[data-userid="${user._id}"]`
  );
  if (exists) return;
  if (!user.name || !user) {
    console.warn("append user recieved invaild user");
  }
  const userWrapper = document.createElement("div");
  userWrapper.className = "users-menu__item";
  userWrapper.dataset.userid = user._id;
  userWrapper.dataset.convoid = convoId;
  const userImg = document.createElement("img");
  userImg.src = `/img/${user.photo}`;

  const nameMessageWrapper = document.createElement("div");
  nameMessageWrapper.className = "name-message-wrapper";
  const userName = document.createElement("h5");
  userName.textContent = user.name;

  userWrapper.appendChild(userImg);
  nameMessageWrapper.appendChild(userName);
  userWrapper.appendChild(nameMessageWrapper);
  UsersMenu.prepend(userWrapper);
};

// === Load previous messages between users ===
const loadConversationMessages = async (conversationId) => {
  document.getElementById("messageBox").innerHTML = "";
  showLoader(document.getElementById("messageBox"), "convo-loader");
  try {
    const res = await axios.get(
      `http://127.0.0.1:4000/api/messages/conversation/${conversationId}`
    );
    if (res.data.status === "success") {
      if (res.data.data !== null) {
        const messages = res.data.data.conversationMessages;
        messages.forEach((msg) => {
          const isSelf = msg.sender._id === currentUser;
          appendMessage(msg.content, isSelf, msg.createdAt, msg.seen, msg._id);
        });
        //original senders
        const seenMessageIds = messages
          .filter((msg) => msg.receiver._id === currentUser && !msg.seen)
          .map((msg) => msg._id);

        socket.emit("messages-seen", {
          messageIds: seenMessageIds,
          senderIds: messages.map((m) => m.sender._id), // optional
        });
      } else {
        return;
      }
    }
  } catch (error) {
    console.error(error.response);
  } finally {
    hideLoader("convo-loader");
  }
};

// === Setup conversation UI ===
const displayConversationSection = async (user) => {
  conversationWrapper.innerHTML = "";
  conversationWrapper.dataset.userid = user._id;

  conversationWrapper.classList.remove("hidden");
  conversationWrapper.classList.add("animate__animated", "animate__fadeInDown");

  //===get conversation id but it on the conversation wrapper===
  try {
    const res = await axios.get(
      `http://127.0.0.1:4000/api/conversations/${conversationWrapper.dataset.userid}/messages`
    );
    if (res.data.status === "success") {
      if (res.data.data !== null) {
        conversationWrapper.dataset.conversationid =
          res.data.data.conversation._id;
      } else {
        conversationWrapper.dataset.conversationid = "";
        // when you open a chat from list then open a chat from search menu the messages of the previosly clicked chat shows up this prevents it
      }
    }
  } catch (error) {
    console.error(error.response);
  }
  // Header

  const conversationHeader = document.createElement("div");
  conversationHeader.className = "conversation-header";

  const backIcon = document.createElement("i");
  backIcon.classList.add("fa-solid", "fa-arrow-left");

  const userImg = document.createElement("img");
  userImg.src = `/img/${user.photo}`;

  const userName = document.createElement("h5");
  userName.textContent = user.name;

  conversationHeader.appendChild(backIcon);
  conversationHeader.appendChild(userImg);
  conversationHeader.appendChild(userName);
  conversationWrapper.appendChild(conversationHeader);

  // Message box
  const messageBox = document.createElement("div");
  messageBox.id = "messageBox";
  conversationWrapper.appendChild(messageBox);

  // Input form
  const form = document.createElement("form");
  form.id = "chatForm";
  form.dataset.userid = user._id;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type a message";

  const button = document.createElement("button");
  button.textContent = "Send";

  form.appendChild(input);
  form.appendChild(button);
  conversationWrapper.appendChild(form);

  //---------------------close conversation wrapper
  backIcon.addEventListener("click", (e) => {
    e.preventDefault();
    conversationWrapper.innerHTML = "";
    conversationWrapper.classList.add("hidden");
  });

  // Handle message sending
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = input.value.trim();

    if (content) {
      await sendMessage(content, form.dataset.userid, currentUser);
      input.value = "";
    }
  });
  if (conversationWrapper.dataset.conversationid) {
    await loadConversationMessages(conversationWrapper.dataset.conversationid);
  }
};

// === Send a message (API + Socket) ===
const sendMessage = async (content, receiver, sender) => {
  try {
    const res = await axios({
      method: "POST",
      url: `http://127.0.0.1:4000/api/conversations/${receiver}/messages`,
      data: { sender, receiver, content },
    });

    if (res.data.status === "success") {
      const message = res.data.data.message;

      appendMessage(
        message.content,
        true,
        message.createdAt,
        message.seen,
        message._id
      );

      // 🔁 Emit real-time message via socket
      socket.emit("send-msg", {
        messageId: message._id,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        createdAt: message.createdAt,
        seen: message.seen,
      });

      //remove temp user class if the sender decided to send a message
      const userListItem = document.querySelector(
        `.users-menu__item[data-userid="${receiver}"]`
      );
      if (userListItem.classList.contains("temp-user")) {
        userListItem.classList.remove("temp-user");
      }
      //---------------------------------------------------------
      const nameMessageWrapper = userListItem.querySelector(
        ".name-message-wrapper"
      );
      if (!document.querySelector(".last-message")) {
        const lastMessage = document.createElement("p");
        lastMessage.textContent = "";
        lastMessage.textContent =
          sender === currentUser ? ` you :${content}` : content;
        nameMessageWrapper.appendChild(lastMessage);
        const LastMessageTime = document.createElement("p");
        LastMessageTime.className = "last-message-time";
        LastMessageTime.textContent = new Date(
          message.createdAt
        ).toLocaleString("en-us", {
          hour: "numeric",
          minute: "numeric",
          weekday: "short",
        });
        nameMessageWrapper.appendChild(LastMessageTime);
      } else {
        document.querySelector(".last-message").textContent = "";
        document.querySelector(".last-message").textContent =
          sender === currentUser
            ? processMessage(`you: ${content}`)
            : processMessage(content);

        document.querySelector(".last-message-time").textContent = "";
        document.querySelector(".last-message-time").textContent = new Date(
          message.createdAt
        ).toLocaleString("en-us", {
          hour: "numeric",
          minute: "numeric",
          weekday: "short",
        });
      }
    }
  } catch (error) {
    console.error("Send message failed", error.response?.data || error.message);
  }
};
// Load previous conversation

// loadConversationMessages(conversationWrapper.dataset.conversationid);

// === Socket.IO: Handle receiving real-time messages ===
socket.on("msg-receive", async (data) => {
  console.log("[Socket Received] data:", data);

  const activeChatForm = document.querySelector(".conversation-wrapper");

  const activeUserId = activeChatForm?.dataset.userid;

  let messageStatus;
  // Append message to open chat if it's the active one
  if (activeUserId === data.sender) {
    if (notificationSound) {
      notificationSound.play().catch((err) => {
        console.warn("sound play blocked in browser", err);
      });
    }
    try {
      console.log("trying to chang the message ");
      const res = await axios.patch(
        `http://127.0.0.1:4000/api/messages/${data.messageId}`,
        {
          seen: true,
        }
      );
      console.log(res);
      messageStatus = res.data.data.updatedMessage.seen;
    } catch (error) {
      console.log(error);
    }
    data.seen = messageStatus;

    appendMessage(
      data.content,
      false,
      data.createdAt,
      data.seen,
      data.messageId
    );
    socket.emit("msg-seen", {
      messageId: data.messageId,
      sender: data.sender,
      receiver: data.receiver,
    });
  }

  //=== Update last message in sidebar ===
  const userListItem = document.querySelector(
    `.users-menu__item[data-userid="${data.sender}"]`
  );

  if (userListItem) {
    const nameMessageWrapper = userListItem.querySelector(
      ".name-message-wrapper"
    );

    if (nameMessageWrapper) {
      let lastMsgElem = nameMessageWrapper.querySelector(".last-message");
      const LastMessageTime =
        nameMessageWrapper.querySelector(".last-message-time");

      lastMsgElem.textContent = "";
      if (!lastMsgElem) {
        // Create it if it doesn't exist
        lastMsgElem = document.createElement("p");
        lastMsgElem.classList.add("last-message");
        lastMsgElem.style.color = "white";
        nameMessageWrapper.appendChild(lastMsgElem);
        const LastMessageTime = document.createElement("p");
        LastMessageTime.className = "last-message-time";
        LastMessageTime.textContent = new Date(data.createdAt).toLocaleString(
          "en-us",
          {
            hour: "numeric",
            minute: "numeric",
            weekday: "short",
          }
        );
        LastMessageTime.style.color = "white";
        nameMessageWrapper.appendChild(LastMessageTime);
      }
      // Update its content
      lastMsgElem.textContent = `${data.content}`;
      lastMsgElem.style.color = "white";
      LastMessageTime.textContent = new Date(data.createdAt).toLocaleString(
        "en-us",
        {
          hour: "numeric",
          minute: "numeric",
          weekday: "short",
        }
      );
    } else {
      console.warn("name-message-wrapper not found in userListItem");
    }
  } else {
    console.warn("userListItem not found for sender:", data.sender);
  }

  // 2. Check if sender is already in sidebar
  let userExists = document.querySelector(
    `.users-menu__item[data-userid="${data.sender}"]`
  );

  console.log(userExists);

  if (userExists) {
    UsersMenu.prepend(userExists);
    if (notificationSound) {
      notificationSound.play().catch((err) => {
        console.warn("sound play blocked in browser", err);
      });
    }
  } else {
    try {
      // === Fetch the new user's profile ===
      const resUser = await axios.get(
        `http://127.0.0.1:4000/api/users/${data.sender}`
      );
      const newUser = resUser.data.data.user;

      // === Fetch the conversation between current user and this sender ===
      const resConvo = await axios.get(
        `http://127.0.0.1:4000/api/conversations/${data.sender}/messages`
      );

      const convoId = resConvo.data.data.conversation._id;
      // ✅ Append user with convoId
      appendUser(newUser, convoId);
      updateOnlineStatus();

      // ✅ Prepend to sidebar
      const newUserEl = document.querySelector(
        `.users-menu__item[data-userid="${newUser._id}"]`
      );

      if (newUserEl) UsersMenu.prepend(newUserEl);
      const nameMessageWrapper = newUserEl.querySelector(
        ".name-message-wrapper"
      );
      let lastMsgElem = nameMessageWrapper.querySelector(".last-message");
      if (!lastMsgElem) {
        // Create it if it doesn't exist
        lastMsgElem = document.createElement("p");
        lastMsgElem.classList.add("last-message");
        lastMsgElem.textContent = `${data.content}`;
        lastMsgElem.style.color = "white";
        nameMessageWrapper.appendChild(lastMsgElem);
        const LastMessageTime = document.createElement("p");
        LastMessageTime.className = "last-message-time";
        LastMessageTime.textContent = new Date(data.createdAt).toLocaleString(
          "en-us",
          {
            hour: "numeric",
            minute: "numeric",
            weekday: "short",
          }
        );
        nameMessageWrapper.appendChild(lastMsgElem);
        nameMessageWrapper.appendChild(LastMessageTime);
      }
    } catch (err) {
      console.error("Error handling new user on message receive:", err);
    }
  }
});

//------------------------------------------------------
socket.on("online-users", (userIds) => {
  onlineUserIds = userIds;
  updateOnlineStatus();
});

socket.on("msg-seen", ({ messageId }) => {
  console.log("📩 msg-seen received on sender side:", messageId);
  if (document.querySelector(`i[data-message-id]=${messageId}`)) {
    const tickIcon = document.querySelector(
      `i[data-message-id="${messageId}"]`
    );

    if (tickIcon && tickIcon.classList.contains("delivered")) {
      tickIcon.classList.remove("delivered");
      tickIcon.classList.add("seen");
    }
  }
});

socket.on("messages-seen", ({ messageIds }) => {
  messageIds.forEach((id) => {
    const tickIcon = document.querySelector(`i[data-message-id="${id}"]`);
    if (tickIcon && tickIcon.classList.contains("delivered")) {
      tickIcon.classList.remove("delivered");
      tickIcon.classList.add("seen");
    }
  });
});
//--------------------------------------------------------

const searchInput = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();

  if (query.length === 0) {
    searchResults.innerHTML = "";
    searchResults.style.display = "none"; // 👈 hide
    return;
  }

  try {
    const res = await axios.get(
      `http://127.0.0.1:4000/api/users/search-users?query=${encodeURIComponent(
        query
      )}`
    );

    const users = res.data.data.users;
    searchResults.innerHTML = ""; // clear results

    if (users.length === 0) {
      searchResults.innerHTML = "<li>No users found</li>";
    } else {
      users.forEach((user) => {
        if (user._id !== currentUser) {
          const li = document.createElement("li");
          li.textContent = user.name;
          li.dataset.userid = user._id;
          li.classList.add("user-item");

          // 👇 Add click event to load conversation and hide results
          li.addEventListener("click", () => {
            searchInput.value = ""; // clear input
            searchResults.innerHTML = ""; // clear results
            searchResults.style.display = "none"; // hide results
          });

          searchResults.appendChild(li);
          searchResults.style.display = "block";
        }
      });
    }

    // 👇 Show results if there are users
  } catch (err) {
    console.error("Search error:", err);
    searchResults.innerHTML = "";
    searchResults.style.display = "none"; // hide on error
  }
});
if (searchResults) {
  searchResults.addEventListener("click", async (event) => {
    event.preventDefault();
    const clickedUserItem = event.target.closest(".user-item");

    if (clickedUserItem) {
      const userId = clickedUserItem.dataset.userid;
      const userDoc = await getUserDoc(userId);
      appendUser(userDoc);
      document
        .querySelector(`.users-menu__item[data-userid="${userId}"]`)
        .classList.add("temp-user");
      updateOnlineStatus();
    }
  });
} else {
  console.error("Error: searchResults container not found");
}

//-----------------------------
