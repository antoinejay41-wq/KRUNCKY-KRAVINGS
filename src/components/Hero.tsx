import React from "react";

interface HeroProps {
  headline: string;
  sub: string;
}

export const Hero: React.FC<HeroProps> = ({ headline, sub }) => {
  return (
    <section className="pt-10 sm:pt-12 pb-7">
      <h1 className="font-bagel text-[clamp(34px,7vw,56px)] leading-[1.08] text-[var(--brand)] max-w-[14ch] tracking-normal">
        {headline}
      </h1>
      <p className="text-[var(--muted)] font-normal text-base sm:text-lg max-w-[46ch] mt-3 leading-relaxed">
        {sub}
      </p>
    </section>
  );
};
