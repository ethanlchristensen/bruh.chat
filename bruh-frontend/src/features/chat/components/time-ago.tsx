import { useState, useEffect } from "react";
import { formatTimeAgo } from "../utils";

interface TimeAgoProps {
  isoDate: string | Date;
}

export const TimeAgo = ({ isoDate }: TimeAgoProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return <span>{formatTimeAgo(isoDate, currentTime)}</span>;
};
