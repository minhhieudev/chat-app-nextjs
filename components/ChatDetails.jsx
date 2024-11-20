import { useState, useEffect, useRef } from "react";
import Loader from "./Loader";
import { AddPhotoAlternate } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CldUploadButton } from "next-cloudinary";
import MessageBox from "./MessageBox";
import { pusherClient } from "@lib/pusher";
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const ChatDetails = ({ chatId }) => {
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState({});
  const [otherMembers, setOtherMembers] = useState([]);

  const { data: session } = useSession();
  const currentUser = session?.user;

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const getChatDetails = async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setChat(data);
      setOtherMembers(
        data?.members?.filter((member) => member._id !== currentUser._id)
      );
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (currentUser && chatId) getChatDetails();
  }, [currentUser, chatId]);

  const sendText = async () => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          currentUserId: currentUser._id,
          text,
        }),
      });

      if (res.ok) {
        setText("");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const sendPhoto = async (result) => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          currentUserId: currentUser._id,
          photo: result?.info?.secure_url,
        }),
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    pusherClient.subscribe(chatId);

    const handleMessage = async (newMessage) => {
      setChat((prevChat) => {
        return {
          ...prevChat,
          messages: [...prevChat.messages, newMessage],
        };
      });
    };

    pusherClient.bind("new-message", handleMessage);

    return () => {
      pusherClient.unsubscribe(chatId);
      pusherClient.unbind("new-message", handleMessage);
    };
  }, [chatId]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat?.messages]);

  const handleEmojiClick = (emojiData) => {
    setText((prevText) => prevText + emojiData.emoji);
  };

  // Handle click outside the emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <div className="h-[99%]">
      <div className="chat-details">
        <div className="chat-header">
          {chat?.isGroup ? (
            <>
              <Link href={`/chats/${chatId}/group-info`}>
                <img
                  src={chat?.groupPhoto || "/assets/group.png"}
                  alt="group-photo"
                  className="profilePhoto"
                />
              </Link>

              <div className="text">
                <p className="text-green-700">
                  {chat?.name} {"("}{chat?.members?.length}{" "}
                  members{")"}
                </p>
              </div>
            </>
          ) : (
            <>
              <img
                src={otherMembers[0].profileImage || "/assets/person.jpg"}
                alt="profile photo"
                className="profilePhoto"
              />
              <div className="text">
                <p>{otherMembers[0].username}</p>
              </div>
            </>
          )}
        </div>

        <div className="chat-body">
          {chat?.messages?.map((message, index) => (
            <MessageBox
              key={index}
              message={message}
              currentUser={currentUser}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="send-message">
          <div className="prepare-message relative">
            <CldUploadButton
              options={{ maxFiles: 1 }}
              onUpload={sendPhoto}
              uploadPreset="e0rggou2"
            >
              <AddPhotoAlternate
                sx={{
                  fontSize: "35px",
                  color: "#737373",
                  cursor: "pointer",
                  "&:hover": { color: "red" },
                }}
              />
            </CldUploadButton>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              😊
            </button>
            <input
              type="text"
              placeholder="Write a message..."
              className="input-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />

            {showEmojiPicker && (
              <div className='absolute right-0 bottom-full p-2 z-50 ' ref={emojiPickerRef}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  disableAutoFocus={true}
                />
              </div>
            )}
          </div>

          <div onClick={sendText}>
            <img src="/assets/send.jpg" alt="send" className="send-icon" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDetails;
