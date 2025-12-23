import { ConversationStarters } from "./conversation-staters";
import { useState } from "react";

interface ConversationLandingStateProps {
  onStartConversation: (message: string) => void;
}

export const ConversationLanding = ({
  onStartConversation,
}: ConversationLandingStateProps) => {
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [key, setKey] = useState(0);

  const handleTopicChange = (topic: string) => {
    setCurrentTopic(topic);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-full py-12 justify-center">
      <div className="mb-8 text-center px-4">
        <h1 className="text-3xl font-bold mb-2">
          Ready to explore{": "}
          {currentTopic && (
            <span
              key={key}
              className="inline-block text-primary animate-in fade-in zoom-in duration-300"
            >
              {currentTopic}
            </span>
          )}
          ?
        </h1>
      </div>

      <ConversationStarters
        onSelectStarter={onStartConversation}
        onTopicChange={handleTopicChange}
      />
    </div>
  );
};
