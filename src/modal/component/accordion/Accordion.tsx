import React, {useState} from "react";

import AccordionItem from "./item/AccordionItem";
import {AccordionData} from "./util/accordionTypes";

interface AccordionProps {
  items: AccordionData[];
}

function Accordion({items}: AccordionProps) {
  const [activeItem, setActiveItem] = useState(0);

  return (
    <ul className={"pera-wallet-accordion"}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          data={item}
          onToggle={handleToggle(index)}
          isActive={index === activeItem}
        />
      ))}
    </ul>
  );

  function handleToggle(index: number) {
    return () => {
      if (activeItem === index) {
        setActiveItem(0);
      }
      setActiveItem(index);
    };
  }
}

export default Accordion;
