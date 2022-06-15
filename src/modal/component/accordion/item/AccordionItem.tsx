import "./_accordion-item.scss";

import React from "react";

import AccordionButton from "../button/AccordionButton";
import AccordionPanel from "../panel/AccordionPanel";
import {AccordionData} from "../util/accordionTypes";

interface AccordionItemProps {
  data: AccordionData;
  onToggle: VoidFunction;
  isActive: boolean;
}

function AccordionItem({data, onToggle, isActive}: AccordionItemProps) {
  const {title, description} = data;

  return (
    <li
      className={`pera-wallet-accordion-item ${
        isActive ? "pera-wallet-accordion-item--active" : ""
      }`}>
      <AccordionButton onClick={onToggle}>{title}</AccordionButton>

      <AccordionPanel>{description}</AccordionPanel>
    </li>
  );
}

export default AccordionItem;
