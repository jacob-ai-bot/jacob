import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const RealTimeWaveform = () => {
  const [heights, setHeights] = useState<number[]>(new Array(20).fill(1));

  useEffect(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateHeights = () => {
        analyser.getByteFrequencyData(dataArray);
        setHeights(dataArray.slice(0, 20));
        requestAnimationFrame(updateHeights);
      };

      updateHeights();
    });
  }, []);

  console.log(heights);

  return (
    <div className="absolute left-1/2 top-1 mt-4 flex -translate-x-1/2 transform justify-center">
      <div className="flex items-center space-x-1">
        {heights.map((value, index) => (
          <motion.div
            key={index}
            className="w-1 bg-aurora-500"
            style={{
              height: "50px",
              transformOrigin: "center",
            }}
            animate={{
              scaleY: value / 5 || 0,
            }}
            transition={{
              duration: 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RealTimeWaveform;
