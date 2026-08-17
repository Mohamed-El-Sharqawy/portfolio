import Hero from "@/components/sections/hero/Hero";
import About from "@/components/sections/about/About";
import Work from "@/components/sections/work/Work";
import Agentic from "@/components/sections/agentic/Agentic";
import Experience from "@/components/sections/experience/Experience";
import Skills from "@/components/sections/skills/Skills";
import Contact from "@/components/sections/contact/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Work />
      <Agentic />
      <Experience />
      <Skills />
      <Contact />
    </>
  );
}
