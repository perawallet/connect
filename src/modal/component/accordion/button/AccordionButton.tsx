import "./_accordion-button.scss";

import React from "react";

import AccordionIcon from "../icon/AccordionIcon";

interface AccordionButtonProps {
  children: React.ReactNode;
  onClick: VoidFunction;
}

function AccordionButton({children, onClick}: AccordionButtonProps) {
  return (
    <button className={"pera-wallet-accordion-button"} onClick={onClick}>
      <AccordionIcon />

      <p>{children}</p>
    </button>
  );
}

export default AccordionButton;
