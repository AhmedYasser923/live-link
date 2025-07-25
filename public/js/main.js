import {
  getUserDoc,
  displayUsersOnSidebar,
  displayConversationSection,
  loadConversation,
  loadConversationMessages,
  appendMessages,
  appendMessage,
  sendMessage,
  processTimestamp,
  processMessage,
  updateLastMessage,
} from "./utilities.js";

const notificationSound = new Audio("../sounds/notification.mp3");
notificationSound.volume = 0.5; // optional: set volume
//=====Get Elements=====
const navbar = document.querySelector(".nav");
const sidebarChatsSection = document.querySelector(".sidebar__chats");
const conversationWrapper = document.querySelector(".conversation-wrapper");

let currentChat = {
  otherParticipantID: null,
  messageBox: null,
  chatForm: null,
  conversationID: null,
  messages: null,
  backIcon: null,
};

//=====Get Data from Elements=====
const loggedInUserId = navbar.dataset.loggedinuser;
//---------------------------------------------------
const socket = io("https://live-link-production.up.railway.app/");
socket.emit("add-user", loggedInUserId);

let onlineUserIds = [];

socket.on("online-users", (userIds) => {
  onlineUserIds = userIds;
  updateOnlineStatus();
});

function updateOnlineStatus() {
  if (!onlineUserIds.length) return;

  document.querySelectorAll(".chat-wrapper.online").forEach((el) => {
    el.classList.remove("online");
  });

  onlineUserIds.forEach((userId) => {
    const userItem = document.querySelector(
      `.chat-wrapper[data-id="${userId}"]`
    );
    if (userItem) {
      userItem.classList.add("online");
    }
  });

  const conversationHeaders = document.querySelectorAll(
    ".conversation-header.online"
  );
  conversationHeaders.forEach((el) => el.classList.remove("online"));
  onlineUserIds.forEach((userId) => {
    const conversationHeader = document.querySelector(
      `.conversation-header[data-id="${userId}"]`
    );
    if (conversationHeader) {
      conversationHeader.classList.add("online");
    }
  });
}

//=====Load All Conversations for the current user=====
const LoadAllConversations = async (loggedInUserId) => {
  try {
    const res = await axios.get(`/api/conversations`);
    if (res.data.status === "success") {
      if (res.data.data !== null) {
        const conversations = res.data.data.conversations;

        conversations.forEach(async (conversation) => {
          //=====extract other participants and removing the logged in user=====
          let participants = [];
          participants.push(...conversation.participants);
          let otherParticipantID;
          participants.forEach((participant) => {
            if (participant !== loggedInUserId) {
              otherParticipantID = participant;
            }
          });
          //=====Extract last Message =====
          let lastMessage;
          let lastMessageSenderId;
          let lastMessageTimestamp;
          let lastMessageWasSeen;
          if (conversation.lastMessage) {
            lastMessage = conversation.lastMessage.content;
            lastMessageSenderId = conversation.lastMessageSender;
            lastMessageTimestamp = conversation.updatedAt;
            lastMessageWasSeen = conversation.lastMessage.seen;
          }
          await displayUsersOnSidebar({
            container: sidebarChatsSection,
            loggedInUserId,
            otherParticipantID,
            lastMessage,
            lastMessageSenderId,
            lastMessageTimestamp,
            lastMessageWasSeen,
          });
          updateOnlineStatus();
        });
        //=====displaying the users on the sidebar=====
      }
      return; //if res.data.data = null
    }
  } catch (error) {
    console.log(error.response);
  }
};

LoadAllConversations(loggedInUserId);

//======When the user clicks on an Extisting chat=====
sidebarChatsSection.addEventListener("click", async (e) => {
  const clickedChat = e.target.closest(".chat-wrapper");
  if (clickedChat) {
    const otherParticipantID = clickedChat.dataset.id;
    const { messageBox, chatForm, backIcon } = await displayConversationSection(
      {
        otherParticipantID,
        container: conversationWrapper,
      }
    );
    updateOnlineStatus();
    const { conversation } = await loadConversation({
      otherParticipantID,
      messageBox,
    });

    const { messages } = await loadConversationMessages({
      conversationID: conversation._id,
      messageBox,
    });

    socket.emit("messages-seen", {
      messages,
      loggedInUserId,
    });

    appendMessages({ messageBox, messages, loggedInUserId });

    currentChat = {
      messageBox,
      chatForm,
      conversationID: conversation._id,
      otherParticipantID,
      messages,
      backIcon,
    };

    const lastMessage = clickedChat.querySelector(".last-message");
    if (lastMessage.classList.contains("message-not-read")) {
      lastMessage.classList.remove("message-not-read");
      lastMessage.classList.add("message-read");
    }

    conversationWrapper.classList.remove("hidden");
    attachFormListener(chatForm);
    attachEventListener(backIcon);

    // socket.emit("messages-seen", { messages });
  }
});

//=====close/open conversation====
function attachEventListener(backIcon) {
  backIcon.addEventListener("click", (e) => {
    e.preventDefault();
    conversationWrapper.innerHTML = "";
    conversationWrapper.classList.toggle("hidden");
  });
}

//=====When the user sends a message=====
function attachFormListener(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let input = form.firstElementChild;
    const content = input.value;

    const { message } = await sendMessage({
      otherParticipantID: currentChat.otherParticipantID,
      content,
    });

    appendMessage({
      messageBox: currentChat.messageBox,
      message,
      loggedInUserId,
    });

    input.value = "";

    socket.emit("send-msg", {
      messageId: message._id,
      sender: message.sender,
      receiver: message.receiver,
      createdAt: message.createdAt,
      content: message.content,
      conversationId: message.conversation,
      seen: message.seen,
    });

    const chat = sidebarChatsSection.querySelector(
      `.chat-wrapper[data-id="${message.receiver}"]`
    );
    if (!chat) {
      const { chatWrapper } = await displayUsersOnSidebar({
        container: sidebarChatsSection,
        loggedInUserId: message.receiver,
        otherParticipantID: message.sender,
        lastMessage: message.content,
        lastMessageSenderId: message.sender,
        lastMessageTimestamp: message.createdAt,
        lastMessageWasSeen: message.seen,
      });
      sidebarChatsSection.prepend(chatWrapper);
      updateOnlineStatus();
    } else {
      updateLastMessage({
        when: "onSend",
        container: sidebarChatsSection,
        message: message,
        otherParticipantID: message.receiver,
      });
    }
  });
}

socket.on("msg-receive", async (data) => {
  notificationSound.play().catch((err) => {
    console.warn("sound play blocked in browser", err);
  });

  const conversationWrapper = document.querySelector(".conversation-wrapper");
  const conversationHeader = conversationWrapper.querySelector(
    ".conversation-header"
  );
  const sidebarChatsSection = document.querySelector(".sidebar__chats");

  if (conversationHeader) {
    const otherParticipantID = conversationHeader.dataset.id;
    const messageBox = conversationWrapper.querySelector("#messageBox");

    if (otherParticipantID === data.sender.toString()) {
      appendMessage({
        messageBox,
        message: data,
        loggedInUserId: data.receiver,
      });
      try {
        const res = await axios.patch(`/api/messages/${data.messageId}`, {
          seen: true,
        });
        const updatedMessage = res.data.data.updatedMessage;
        socket.emit("msg-seen", {
          messageId: data.messageId,
          sender: data.sender,
          receiver: data.receiver,
        });

        updateLastMessage({
          when: "onReceive",
          container: sidebarChatsSection,
          message: updatedMessage,
          otherParticipantID: data.sender,
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  //------------------------------------------------

  if (!conversationHeader) {
    const sidebarChatsSection = document.querySelector(".sidebar__chats");
    const chat = sidebarChatsSection.querySelector(
      `.chat-wrapper[data-id="${data.sender}"]`
    );

    if (!chat) {
      const { chatWrapper } = await displayUsersOnSidebar({
        container: sidebarChatsSection,
        loggedInUserId: data.receiver,
        otherParticipantID: data.sender,
        lastMessage: data.content,
        lastMessageSenderId: data.sender,
        lastMessageTimestamp: data.createdAt,
        lastMessageWasSeen: data.seen,
      });
      updateOnlineStatus();
      sidebarChatsSection.prepend(chatWrapper);
    }
  }
  updateLastMessage({
    when: "onReceive",
    container: sidebarChatsSection,
    message: data,
    otherParticipantID: data.sender,
  });
});

//=====searching for users=====
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
      `/api/users/search-users?query=${encodeURIComponent(query)}`
    );

    const users = res.data.data.users;
    searchResults.innerHTML = ""; // clear results

    if (users.length === 0) {
      searchResults.innerHTML = "<li>No users found</li>";
    } else {
      users.forEach((user) => {
        if (user._id !== loggedInUserId) {
          const searchItemWrapper = document.createElement("div");
          searchItemWrapper.className = "search-item-wrapper";
          const li = document.createElement("li");
          li.textContent = user.name;
          li.dataset.id = user._id;
          li.classList.add("user-item");
          const img = document.createElement("img");
          img.src = `/img/${user.photo}`;

          searchItemWrapper.appendChild(img);
          searchItemWrapper.append(li);
          searchResults.appendChild(searchItemWrapper);
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
    //------------------------------------------------
    if (clickedUserItem) {
      searchInput.value = ""; // clear input
      searchResults.innerHTML = ""; // clear results
      searchResults.style.display = "none"; // hide results
      if (
        !document.querySelector(
          `.chat-wrapper[data-id="${clickedUserItem.dataset.id}"]`
        )
      ) {
        const { chatWrapper } = await displayUsersOnSidebar({
          otherParticipantID: clickedUserItem.dataset.id,
          temporary: true,
          container: sidebarChatsSection,
        });
        updateOnlineStatus();
      }
      //------------------------------------------------
      const { messageBox, chatForm } = await displayConversationSection({
        otherParticipantID: clickedUserItem.dataset.id,
        container: conversationWrapper,
      });
      updateOnlineStatus();

      //------------------------------------------------
      chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        let input = chatForm.firstElementChild;
        const content = input.value;
        const { message } = await sendMessage({
          otherParticipantID: clickedUserItem.dataset.id,
          content,
        });
        appendMessage({ messageBox, message, loggedInUserId });
        socket.emit("send-msg", {
          messageId: message._id,
          sender: message.sender,
          receiver: message.receiver,
          createdAt: message.createdAt,
          content: message.content,
          conversationId: message.conversation,
          seen: message.seen,
        });
        input.value = "";
        updateLastMessage({
          when: "onSend",
          container: sidebarChatsSection,
          message: message,
          otherParticipantID: message.receiver,
        });

        chatWrapper.classList.remove("temp-user");
      });
    }
  });
} else {
  console.error("Error: searchResults container not found");
}

//-------------------------------------------------------------------

socket.on("messages-seen", ({ messageIds }) => {
  messageIds.forEach((messageId) => {
    const wrapper = document.querySelector(
      `.message-wrapper[data-messageid="${messageId}"]`
    );
    const tickIcon = wrapper?.querySelector(".tick-icon");

    if (tickIcon && tickIcon.classList.contains("delivered")) {
      tickIcon.classList.remove("delivered");
      tickIcon.classList.add("seen");
    }
  });
});

socket.on("msg-seen", ({ messageId }) => {
  const wrapper = document.querySelector(
    `.message-wrapper[data-messageid="${messageId}"]`
  );
  const tickIcon = wrapper?.querySelector(".tick-icon");

  if (tickIcon && tickIcon.classList.contains("delivered")) {
    tickIcon.classList.remove("delivered");
    tickIcon.classList.add("seen");
  }
});

window.addEventListener("resize", () => {
  document.body.style.height = `${window.innerHeight}px`;
});
