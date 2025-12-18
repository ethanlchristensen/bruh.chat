import { createFileRoute } from "@tanstack/react-router";
import React from "react";

const About: React.FC = () => {
  return (
    <div className="w-full h-full p-4 flex justify-center items-center bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg space-y-6">
        <h1 className="text-primary text-3xl font-bold text-center">
          Welcome to ChatApp!
        </h1>
        <p className="text-muted-foreground text-xl text-center mb-4">
          Experience the future of conversational AI with our cutting-edge chat
          app.
        </p>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            <h3 className="text-primary text-lg font-semibold">
              Wide Range of Models
            </h3>
            <p className="text-muted-foreground">
              Interact with a diverse array of AI models through Open Router,
              each designed to serve different needs.
            </p>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-primary text-lg font-semibold">
              Image Generation
            </h3>
            <p className="text-muted-foreground">
              Generate stunning images directly from your chat with models that
              support this advanced feature.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            <h3 className="text-primary text-lg font-semibold">
              Slash Commands
            </h3>
            <p className="text-muted-foreground">
              Effortlessly switch between intents using slash commands in the
              text input (e.g., /image for image generation).
            </p>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-primary text-lg font-semibold">
              Seamless Integration
            </h3>
            <p className="text-muted-foreground">
              Enjoy a seamless and intuitive experience, with all features
              designed to enhance your chat capabilities.
            </p>
          </div>
        </div>

        <button className="w-full bg-primary text-card-foreground p-4 rounded-lg hover:bg-primary/80 transition duration-300">
          Get Started Now
        </button>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_protected/about")({
  component: About,
});
