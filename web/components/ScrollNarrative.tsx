"use client";

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const chapters = [
  {
    id: 0,
    title: "Dubai Mobility Shift",
    content: "Visualizing the comprehensive network of bus routes and stops across Dubai. A dynamic shift towards efficient, interconnected urban transit."
  },
  {
    id: 1,
    title: "The Urban Core",
    content: "Deira and Downtown form the dense epicenter of the network. High-frequency City and Feeder routes ensure constant flow, navigating the bustling commercial hub."
  },
  {
    id: 2,
    title: "Coastal Expansion",
    content: "The Marina and Jebel Ali zones feature essential express links and targeted feeder services, rapidly connecting the waterfront and industrial districts."
  }
];

interface ScrollNarrativeProps {
  onChapterChange: (id: number) => void;
}

export default function ScrollNarrative({ onChapterChange }: ScrollNarrativeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const chapterHeight = windowHeight * 1.5; // Each chapter takes 150vh
      
      const rawCurrentChapter = Math.floor((scrollY + windowHeight / 2) / chapterHeight);
      const activeChapter = Math.min(Math.max(rawCurrentChapter, 0), chapters.length - 1);
      
      onChapterChange(activeChapter);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onChapterChange]);

  return (
    <div ref={containerRef} className="relative z-10 w-full md:w-1/3 min-h-screen pointer-events-none">
      <div className="pt-[50vh] pb-[50vh]">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="h-[150vh] flex flex-col justify-center px-8 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ margin: "-20% 0px -20% 0px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 p-8 rounded-4xl shadow-2xl pointer-events-auto"
            >
              <div className="w-12 h-1 bg-sky-400 rounded-full mb-6"></div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-white">{chapter.title}</h2>
              <p className="text-slate-300 text-lg leading-relaxed">{chapter.content}</p>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
